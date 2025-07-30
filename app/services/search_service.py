"""PostgreSQL full-text search service for product catalog."""

import time
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, and_, or_, case
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.models.product import Product, Category
from app.models.product_variant import ProductVariant
from app.models.product_image import ProductImage, ImageType
from app.models.inventory import Inventory
from app.schemas.product import ProductFilters, SortOrder, SearchResultResponse, CursorPagination
from app.services.cache_service import cache_service


class SearchService:
    """PostgreSQL full-text search service for products."""
    
    def __init__(self):
        """Initialize search service."""
        self.default_rank_weights = "A=1.0,B=0.4,C=0.2,D=0.1"
        
    async def search_products(
        self,
        db: AsyncSession,
        query: str,
        filters: Optional[ProductFilters] = None,
        sort_by: SortOrder = SortOrder.CREATED_DESC,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> SearchResultResponse:
        """
        Perform full-text search on products with filters and pagination.
        """
        start_time = time.time()
        
        # Check cache first
        cache_key = self._generate_search_cache_key(query, filters, sort_by, limit, cursor)
        cached_result = cache_service.get_search_results(cache_key)
        if cached_result:
            return SearchResultResponse(**cached_result)
        
        # Build the search query
        search_query = self._build_search_query(query, filters, sort_by)
        
        # Execute search with pagination
        results, total_count, has_next = await self._execute_search_query(
            db, search_query, limit, cursor
        )
        
        # Process results
        products = await self._process_search_results(db, results)
        
        # Calculate pagination
        pagination = CursorPagination(
            cursor=results[-1]['cursor'] if results and has_next else None,
            has_next=has_next,
            has_previous=cursor is not None,
            total_count=total_count
        )
        
        search_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        response = SearchResultResponse(
            products=products,
            pagination=pagination,
            search_query=query,
            filters_applied=filters,
            total_count=total_count,
            search_time_ms=round(search_time, 2)
        )
        
        # Cache the result
        cache_service.set_search_results(cache_key, response.model_dump())
        
        return response
    
    def _build_search_query(
        self,
        query: str,
        filters: Optional[ProductFilters] = None,
        sort_by: SortOrder = SortOrder.CREATED_DESC
    ) -> str:
        """Build PostgreSQL full-text search query with filters."""
        
        # Start with base query using full-text search
        base_query = """
        WITH search_results AS (
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.description,
                p.short_description,
                p.base_price,
                p.brand,
                p.is_featured,
                p.created_at,
                p.updated_at,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                -- Full-text search ranking
                ts_rank_cd(
                    setweight(to_tsvector('english', COALESCE(p.name, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(p.brand, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(p.short_description, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(p.description, '')), 'D') ||
                    setweight(to_tsvector('english', COALESCE(p.search_keywords, '')), 'B'),
                    plainto_tsquery('english', :search_query)
                ) as search_rank,
                -- Price range calculation
                COALESCE(
                    (SELECT MIN(pv.price) FROM product_variants pv 
                     WHERE pv.product_id = p.id AND pv.is_active = true),
                    p.base_price
                ) as min_price,
                COALESCE(
                    (SELECT MAX(pv.price) FROM product_variants pv 
                     WHERE pv.product_id = p.id AND pv.is_active = true),
                    p.base_price
                ) as max_price,
                -- Stock status
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM product_variants pv
                        JOIN inventory i ON i.product_variant_id = pv.id
                        WHERE pv.product_id = p.id 
                        AND pv.is_active = true 
                        AND i.quantity_available > 0
                    ) THEN true
                    ELSE false
                END as in_stock,
                -- Popularity score (placeholder - would be based on sales, views, etc.)
                COALESCE(p.popularity_score, 0) as popularity
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = true 
            AND p.deleted_at IS NULL
        """
        
        # Add search condition if query provided
        if query and query.strip():
            base_query += """
            AND (
                to_tsvector('english', 
                    COALESCE(p.name, '') || ' ' ||
                    COALESCE(p.brand, '') || ' ' ||
                    COALESCE(p.short_description, '') || ' ' ||
                    COALESCE(p.description, '') || ' ' ||
                    COALESCE(p.search_keywords, '')
                ) @@ plainto_tsquery('english', :search_query)
                OR p.name ILIKE :fuzzy_search
                OR p.brand ILIKE :fuzzy_search
            )
            """
        
        # Add filters
        filter_conditions = []
        if filters:
            if filters.category_id:
                filter_conditions.append("p.category_id = :category_id")
            
            if filters.category_slug:
                filter_conditions.append("c.slug = :category_slug")
            
            if filters.brand:
                filter_conditions.append("p.brand ILIKE :brand_filter")
            
            if filters.price_range:
                if filters.price_range.min_price is not None:
                    filter_conditions.append("min_price >= :min_price")
                if filters.price_range.max_price is not None:
                    filter_conditions.append("max_price <= :max_price")
            
            if filters.is_featured is not None:
                filter_conditions.append("p.is_featured = :is_featured")
            
            if filters.is_digital is not None:
                filter_conditions.append("p.is_digital = :is_digital")
            
            if filters.in_stock is not None:
                if filters.in_stock:
                    filter_conditions.append("in_stock = true")
                else:
                    filter_conditions.append("in_stock = false")
        
        if filter_conditions:
            base_query += " AND " + " AND ".join(filter_conditions)
        
        # Add ordering
        order_clause = self._get_order_clause(sort_by, bool(query and query.strip()))
        base_query += f"\n{order_clause}"
        
        # Complete the query
        final_query = f"""
        {base_query}
        )
        SELECT *, 
               ROW_NUMBER() OVER ({order_clause.replace('ORDER BY', '')}) as row_num,
               CONCAT(id, ':', EXTRACT(EPOCH FROM created_at)::BIGINT) as cursor
        FROM search_results
        """
        
        return final_query
    
    def _get_order_clause(self, sort_by: SortOrder, has_search_query: bool) -> str:
        """Get the ORDER BY clause based on sort preference."""
        order_mapping = {
            SortOrder.PRICE_ASC: "ORDER BY min_price ASC, p.name ASC",
            SortOrder.PRICE_DESC: "ORDER BY max_price DESC, p.name ASC",
            SortOrder.NAME_ASC: "ORDER BY p.name ASC",
            SortOrder.NAME_DESC: "ORDER BY p.name DESC",
            SortOrder.CREATED_ASC: "ORDER BY p.created_at ASC",
            SortOrder.CREATED_DESC: "ORDER BY p.created_at DESC",
            SortOrder.POPULARITY_DESC: "ORDER BY popularity DESC, p.created_at DESC",
            SortOrder.RATING_DESC: "ORDER BY popularity DESC, p.created_at DESC"  # Placeholder for rating
        }
        
        # If there's a search query, prioritize search ranking
        if has_search_query and sort_by in [SortOrder.CREATED_DESC, SortOrder.POPULARITY_DESC]:
            return "ORDER BY search_rank DESC, popularity DESC, p.created_at DESC"
        
        return order_mapping.get(sort_by, "ORDER BY p.created_at DESC")
    
    async def _execute_search_query(
        self,
        db: AsyncSession,
        query: str,
        limit: int,
        cursor: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int, bool]:
        """Execute the search query with pagination."""
        
        # Prepare query parameters
        params = {
            "search_query": "",  # Will be set below
            "fuzzy_search": "",  # Will be set below
            "limit": limit + 1  # Get one extra to check if there are more results
        }
        
        # Add cursor condition if provided
        cursor_condition = ""
        if cursor:
            cursor_condition = " AND cursor > :cursor "
            params["cursor"] = cursor
        
        # Complete query with pagination
        paginated_query = f"""
        {query}
        {cursor_condition}
        LIMIT :limit
        """
        
        # Execute query
        result = await db.execute(text(paginated_query), params)
        rows = result.fetchall()
        
        # Convert to list of dictionaries
        results = [dict(row._mapping) for row in rows]
        
        # Check if there are more results
        has_next = len(results) > limit
        if has_next:
            results = results[:-1]  # Remove the extra result
        
        # Get total count (expensive operation, consider caching)
        count_query = f"""
        SELECT COUNT(*) as total
        FROM ({query.split('SELECT')[0]}SELECT p.id {query.split('FROM search_results')[0].split('SELECT')[1].split('FROM')[1]}) count_query
        """
        count_result = await db.execute(text(count_query), {k: v for k, v in params.items() if k != "limit"})
        total_count = count_result.scalar() or 0
        
        return results, total_count, has_next
    
    async def _process_search_results(
        self,
        db: AsyncSession,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process search results to include related data."""
        if not results:
            return []
        
        product_ids = [result['id'] for result in results]
        
        # Get products with related data using optimized queries
        products_query = select(Product).options(
            joinedload(Product.category),
            selectinload(Product.variants).options(
                joinedload(ProductVariant.inventory)
            ),
            selectinload(Product.images).where(
                ProductImage.is_active == True
            ).order_by(
                ProductImage.is_primary.desc(),
                ProductImage.sort_order
            )
        ).where(Product.id.in_(product_ids))
        
        products_result = await db.execute(products_query)
        products = products_result.unique().scalars().all()
        
        # Create a mapping for quick lookup
        products_map = {p.id: p for p in products}
        
        # Process each result
        processed_results = []
        for result in results:
            product = products_map.get(result['id'])
            if not product:
                continue
            
            # Get primary image
            primary_image = None
            for image in product.images:
                if image.is_primary:
                    primary_image = {
                        "id": image.id,
                        "url": image.url,
                        "alt_text": image.alt_text,
                        "thumbnail_url": image.thumbnail_url,
                        "medium_url": image.medium_url,
                        "large_url": image.large_url
                    }
                    break
            
            # Build product response
            product_data = {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "short_description": product.short_description,
                "base_price": product.base_price,
                "brand": product.brand,
                "is_featured": product.is_featured,
                "price_range": product.price_range,
                "primary_image": primary_image,
                "category": {
                    "id": product.category.id,
                    "name": product.category.name,
                    "slug": product.category.slug,
                } if product.category else None
            }
            
            processed_results.append(product_data)
        
        return processed_results
    
    async def get_search_suggestions(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 10
    ) -> List[str]:
        """Get search suggestions/autocomplete."""
        if not query or len(query) < 2:
            return []
        
        # Check cache first
        cache_key = f"suggestions:{query.lower()}:{limit}"
        cached_suggestions = cache_service.get(cache_key)
        if cached_suggestions:
            return cached_suggestions
        
        # Search in product names and brands
        suggestions_query = text("""
        SELECT DISTINCT suggestion, ts_rank_cd(search_vector, query) as rank
        FROM (
            SELECT name as suggestion, to_tsvector('english', name) as search_vector,
                   plainto_tsquery('english', :query) as query
            FROM products 
            WHERE is_active = true AND deleted_at IS NULL
            AND name ILIKE :fuzzy_query
            
            UNION
            
            SELECT DISTINCT brand as suggestion, to_tsvector('english', brand) as search_vector,
                   plainto_tsquery('english', :query) as query
            FROM products 
            WHERE is_active = true AND deleted_at IS NULL 
            AND brand IS NOT NULL
            AND brand ILIKE :fuzzy_query
        ) suggestions
        WHERE search_vector @@ query
        ORDER BY rank DESC, LENGTH(suggestion) ASC
        LIMIT :limit
        """)
        
        result = await db.execute(suggestions_query, {
            "query": query,
            "fuzzy_query": f"%{query}%",
            "limit": limit
        })
        
        suggestions = [row[0] for row in result.fetchall()]
        
        # Cache suggestions
        cache_service.set(cache_key, suggestions, ttl=1800)  # 30 minutes
        
        return suggestions
    
    def _generate_search_cache_key(
        self,
        query: str,
        filters: Optional[ProductFilters],
        sort_by: SortOrder,
        limit: int,
        cursor: Optional[str]
    ) -> str:
        """Generate cache key for search results."""
        key_parts = [
            f"search:{query.lower()}",
            f"sort:{sort_by.value}",
            f"limit:{limit}"
        ]
        
        if cursor:
            key_parts.append(f"cursor:{cursor}")
        
        if filters:
            filter_parts = []
            if filters.category_id:
                filter_parts.append(f"cat:{filters.category_id}")
            if filters.category_slug:
                filter_parts.append(f"cat_slug:{filters.category_slug}")
            if filters.brand:
                filter_parts.append(f"brand:{filters.brand}")
            if filters.price_range:
                if filters.price_range.min_price:
                    filter_parts.append(f"min_price:{filters.price_range.min_price}")
                if filters.price_range.max_price:
                    filter_parts.append(f"max_price:{filters.price_range.max_price}")
            if filters.is_featured is not None:
                filter_parts.append(f"featured:{filters.is_featured}")
            if filters.is_digital is not None:
                filter_parts.append(f"digital:{filters.is_digital}")
            if filters.in_stock is not None:
                filter_parts.append(f"stock:{filters.in_stock}")
            
            if filter_parts:
                key_parts.append("filters:" + "|".join(filter_parts))
        
        return ":".join(key_parts)


# Global search service instance
search_service = SearchService()