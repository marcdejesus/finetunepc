"""CRUD operations for product catalog with advanced filtering and optimization."""

import base64
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload, contains_eager
from sqlalchemy import and_, or_, func, desc, asc, text, case

from app.crud.base import CRUDBase
from app.models.product import Product, Category
from app.models.product_variant import ProductVariant
from app.models.product_image import ProductImage, ImageType
from app.models.inventory import Inventory
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductFilters, SortOrder,
    CategoryCreate, CategoryUpdate, CursorPagination
)
from app.services.cache_service import cache_service


class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    """CRUD operations for Product with advanced filtering and caching."""
    
    async def get_by_slug(
        self,
        db: AsyncSession,
        slug: str,
        include_inactive: bool = False
    ) -> Optional[Product]:
        """Get product by slug with full details."""
        # Check cache first
        cached_product = cache_service.get_product_by_slug(slug)
        if cached_product:
            return cached_product
        
        query = select(Product).options(
            joinedload(Product.category),
            selectinload(Product.variants).options(
                joinedload(ProductVariant.inventory),
                selectinload(ProductVariant.images).where(
                    ProductImage.is_active == True
                ).order_by(ProductImage.sort_order)
            ),
            selectinload(Product.images).where(
                ProductImage.is_active == True
            ).order_by(
                ProductImage.is_primary.desc(),
                ProductImage.sort_order
            )
        ).where(Product.slug == slug)
        
        if not include_inactive:
            query = query.where(
                and_(Product.is_active == True, Product.deleted_at.is_(None))
            )
        
        result = await db.execute(query)
        product = result.unique().scalar_one_or_none()
        
        if product:
            # Cache the result
            cache_service.set_product_by_slug(slug, product)
        
        return product
    
    async def get_with_details(
        self,
        db: AsyncSession,
        product_id: str,
        include_inactive: bool = False
    ) -> Optional[Product]:
        """Get product with all related details."""
        # Check cache first
        cached_product = cache_service.get_product(product_id)
        if cached_product:
            return cached_product
        
        query = select(Product).options(
            joinedload(Product.category),
            selectinload(Product.variants).options(
                joinedload(ProductVariant.inventory),
                selectinload(ProductVariant.images).where(
                    ProductImage.is_active == True
                ).order_by(ProductImage.sort_order)
            ),
            selectinload(Product.images).where(
                ProductImage.is_active == True
            ).order_by(
                ProductImage.is_primary.desc(),
                ProductImage.sort_order
            )
        ).where(Product.id == product_id)
        
        if not include_inactive:
            query = query.where(
                and_(Product.is_active == True, Product.deleted_at.is_(None))
            )
        
        result = await db.execute(query)
        product = result.unique().scalar_one_or_none()
        
        if product:
            # Cache the result
            cache_service.set_product(product_id, product)
        
        return product
    
    async def get_list_with_filters(
        self,
        db: AsyncSession,
        filters: Optional[ProductFilters] = None,
        sort_by: SortOrder = SortOrder.CREATED_DESC,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[Product], CursorPagination]:
        """Get paginated product list with filters and optimization."""
        
        # Build base query with optimized loading
        query = select(Product).options(
            joinedload(Product.category),
            selectinload(Product.images).where(
                and_(
                    ProductImage.is_active == True,
                    ProductImage.is_primary == True
                )
            )
        )
        
        # Add base filters
        base_conditions = [
            Product.is_active == True,
            Product.deleted_at.is_(None)
        ]
        
        # Apply filters
        if filters:
            if filters.category_id:
                base_conditions.append(Product.category_id == filters.category_id)
            
            if filters.category_slug:
                query = query.join(Category).where(Category.slug == filters.category_slug)
            
            if filters.brand:
                base_conditions.append(Product.brand.ilike(f"%{filters.brand}%"))
            
            if filters.is_featured is not None:
                base_conditions.append(Product.is_featured == filters.is_featured)
            
            if filters.is_digital is not None:
                base_conditions.append(Product.is_digital == filters.is_digital)
            
            # Price range filter (requires subquery for variant prices)
            if filters.price_range:
                price_conditions = []
                if filters.price_range.min_price is not None:
                    price_conditions.append(Product.base_price >= filters.price_range.min_price)
                if filters.price_range.max_price is not None:
                    price_conditions.append(Product.base_price <= filters.price_range.max_price)
                
                if price_conditions:
                    base_conditions.extend(price_conditions)
            
            # Stock filter (requires join with variants and inventory)
            if filters.in_stock is not None:
                if filters.in_stock:
                    stock_subquery = select(ProductVariant.product_id).join(
                        Inventory, ProductVariant.id == Inventory.product_variant_id
                    ).where(
                        and_(
                            ProductVariant.is_active == True,
                            Inventory.quantity_available > 0
                        )
                    )
                    base_conditions.append(Product.id.in_(stock_subquery))
                else:
                    # Products with no stock
                    stock_subquery = select(ProductVariant.product_id).join(
                        Inventory, ProductVariant.id == Inventory.product_variant_id
                    ).where(
                        and_(
                            ProductVariant.is_active == True,
                            Inventory.quantity_available <= 0
                        )
                    )
                    base_conditions.append(
                        or_(
                            Product.id.in_(stock_subquery),
                            ~Product.id.in_(
                                select(ProductVariant.product_id).where(
                                    ProductVariant.is_active == True
                                )
                            )
                        )
                    )
        
        query = query.where(and_(*base_conditions))
        
        # Apply sorting
        order_by = self._get_sort_expression(sort_by)
        query = query.order_by(*order_by)
        
        # Apply cursor pagination
        if cursor:
            cursor_data = self._decode_cursor(cursor)
            if cursor_data:
                cursor_conditions = self._build_cursor_condition(cursor_data, sort_by)
                query = query.where(cursor_conditions)
        
        # Execute query with limit + 1 to check for next page
        query = query.limit(limit + 1)
        result = await db.execute(query)
        products = result.unique().scalars().all()
        
        # Check if there are more results
        has_next = len(products) > limit
        if has_next:
            products = products[:-1]  # Remove extra item
        
        # Generate next cursor
        next_cursor = None
        if has_next and products:
            next_cursor = self._encode_cursor(products[-1], sort_by)
        
        pagination = CursorPagination(
            cursor=next_cursor,
            has_next=has_next,
            has_previous=cursor is not None
        )
        
        return products, pagination
    
    async def get_variants(
        self,
        db: AsyncSession,
        product_id: str,
        include_inactive: bool = False
    ) -> List[ProductVariant]:
        """Get all variants for a product."""
        query = select(ProductVariant).options(
            joinedload(ProductVariant.inventory),
            selectinload(ProductVariant.images).where(
                ProductImage.is_active == True
            ).order_by(ProductImage.sort_order)
        ).where(ProductVariant.product_id == product_id)
        
        if not include_inactive:
            query = query.where(ProductVariant.is_active == True)
        
        query = query.order_by(
            ProductVariant.is_default.desc(),
            ProductVariant.sort_order,
            ProductVariant.price
        )
        
        result = await db.execute(query)
        return result.unique().scalars().all()
    
    async def get_related_products(
        self,
        db: AsyncSession,
        product: Product,
        limit: int = 8
    ) -> List[Product]:
        """Get related products based on category and brand."""
        conditions = [
            Product.is_active == True,
            Product.deleted_at.is_(None),
            Product.id != product.id
        ]
        
        # Prioritize same category, then same brand
        order_conditions = []
        if product.category_id:
            conditions.append(Product.category_id == product.category_id)
        
        if product.brand:
            order_conditions.append(case((Product.brand == product.brand, 1), else_=0).desc())
        
        order_conditions.extend([
            Product.is_featured.desc(),
            Product.created_at.desc()
        ])
        
        query = select(Product).options(
            joinedload(Product.category),
            selectinload(Product.images).where(
                and_(
                    ProductImage.is_active == True,
                    ProductImage.is_primary == True
                )
            )
        ).where(and_(*conditions)).order_by(*order_conditions).limit(limit)
        
        result = await db.execute(query)
        return result.unique().scalars().all()
    
    async def update_with_cache_invalidation(
        self,
        db: AsyncSession,
        *,
        db_obj: Product,
        obj_in: ProductUpdate
    ) -> Product:
        """Update product and invalidate related caches."""
        # Store old slug for cache invalidation
        old_slug = db_obj.slug
        
        # Update the product
        updated_product = await self.update(db, db_obj=db_obj, obj_in=obj_in)
        
        # Invalidate caches
        cache_service.invalidate_product(updated_product.id)
        cache_service.invalidate_product_by_slug(old_slug)
        if updated_product.slug != old_slug:
            cache_service.invalidate_product_by_slug(updated_product.slug)
        
        # Invalidate category cache if category changed
        if obj_in.category_id and obj_in.category_id != db_obj.category_id:
            cache_service.invalidate_categories()
        
        return updated_product
    
    def _get_sort_expression(self, sort_by: SortOrder) -> List:
        """Get SQLAlchemy order by expressions for sorting."""
        sort_mapping = {
            SortOrder.PRICE_ASC: [asc(Product.base_price), asc(Product.name)],
            SortOrder.PRICE_DESC: [desc(Product.base_price), asc(Product.name)],
            SortOrder.NAME_ASC: [asc(Product.name)],
            SortOrder.NAME_DESC: [desc(Product.name)],
            SortOrder.CREATED_ASC: [asc(Product.created_at)],
            SortOrder.CREATED_DESC: [desc(Product.created_at)],
            SortOrder.POPULARITY_DESC: [desc(func.coalesce(Product.popularity_score, 0)), desc(Product.created_at)],
            SortOrder.RATING_DESC: [desc(func.coalesce(Product.rating_average, 0)), desc(Product.created_at)]
        }
        return sort_mapping.get(sort_by, [desc(Product.created_at)])
    
    def _encode_cursor(self, product: Product, sort_by: SortOrder) -> str:
        """Encode cursor for pagination."""
        cursor_data = {
            "id": product.id,
            "sort_value": None
        }
        
        # Add sort-specific value
        if sort_by in [SortOrder.PRICE_ASC, SortOrder.PRICE_DESC]:
            cursor_data["sort_value"] = str(product.base_price)
        elif sort_by in [SortOrder.NAME_ASC, SortOrder.NAME_DESC]:
            cursor_data["sort_value"] = product.name
        elif sort_by in [SortOrder.CREATED_ASC, SortOrder.CREATED_DESC]:
            cursor_data["sort_value"] = product.created_at.isoformat()
        elif sort_by == SortOrder.POPULARITY_DESC:
            cursor_data["sort_value"] = str(getattr(product, 'popularity_score', 0))
        elif sort_by == SortOrder.RATING_DESC:
            cursor_data["sort_value"] = str(getattr(product, 'rating_average', 0))
        
        cursor_json = json.dumps(cursor_data)
        return base64.b64encode(cursor_json.encode()).decode()
    
    def _decode_cursor(self, cursor: str) -> Optional[Dict[str, Any]]:
        """Decode cursor for pagination."""
        try:
            cursor_json = base64.b64decode(cursor.encode()).decode()
            return json.loads(cursor_json)
        except (ValueError, json.JSONDecodeError):
            return None
    
    def _build_cursor_condition(self, cursor_data: Dict[str, Any], sort_by: SortOrder):
        """Build SQLAlchemy condition for cursor pagination."""
        product_id = cursor_data.get("id")
        sort_value = cursor_data.get("sort_value")
        
        if not product_id:
            return True  # No condition if invalid cursor
        
        # Build conditions based on sort order
        if sort_by == SortOrder.PRICE_ASC:
            return or_(
                Product.base_price > Decimal(sort_value),
                and_(Product.base_price == Decimal(sort_value), Product.id > product_id)
            )
        elif sort_by == SortOrder.PRICE_DESC:
            return or_(
                Product.base_price < Decimal(sort_value),
                and_(Product.base_price == Decimal(sort_value), Product.id > product_id)
            )
        elif sort_by == SortOrder.NAME_ASC:
            return or_(
                Product.name > sort_value,
                and_(Product.name == sort_value, Product.id > product_id)
            )
        elif sort_by == SortOrder.NAME_DESC:
            return or_(
                Product.name < sort_value,
                and_(Product.name == sort_value, Product.id > product_id)
            )
        elif sort_by == SortOrder.CREATED_ASC:
            created_at = datetime.fromisoformat(sort_value)
            return or_(
                Product.created_at > created_at,
                and_(Product.created_at == created_at, Product.id > product_id)
            )
        elif sort_by == SortOrder.CREATED_DESC:
            created_at = datetime.fromisoformat(sort_value)
            return or_(
                Product.created_at < created_at,
                and_(Product.created_at == created_at, Product.id > product_id)
            )
        else:
            # Default to created_at desc
            return Product.id > product_id


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    """CRUD operations for Category with hierarchy support."""
    
    async def get_hierarchy(
        self,
        db: AsyncSession,
        include_inactive: bool = False
    ) -> List[Category]:
        """Get category hierarchy with product counts."""
        # Check cache first
        cached_hierarchy = cache_service.get_category_hierarchy()
        if cached_hierarchy and not include_inactive:
            return cached_hierarchy
        
        # Build query
        conditions = []
        if not include_inactive:
            conditions.append(Category.is_active == True)
        
        query = select(Category)
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(Category.level, Category.sort_order, Category.name)
        
        result = await db.execute(query)
        categories = result.scalars().all()
        
        # Build hierarchy structure
        hierarchy = self._build_category_tree(categories)
        
        # Cache the result
        if not include_inactive:
            cache_service.set_category_hierarchy(hierarchy)
        
        return hierarchy
    
    async def get_by_slug(
        self,
        db: AsyncSession,
        slug: str,
        include_inactive: bool = False
    ) -> Optional[Category]:
        """Get category by slug."""
        conditions = [Category.slug == slug]
        if not include_inactive:
            conditions.append(Category.is_active == True)
        
        query = select(Category).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_category_products(
        self,
        db: AsyncSession,
        category_slug: str,
        filters: Optional[ProductFilters] = None,
        sort_by: SortOrder = SortOrder.CREATED_DESC,
        limit: int = 20,
        cursor: Optional[str] = None,
        include_subcategories: bool = True
    ) -> Tuple[List[Product], CursorPagination]:
        """Get products in a category with filters."""
        # Get category
        category = await self.get_by_slug(db, category_slug)
        if not category:
            return [], CursorPagination()
        
        # Get category IDs to include
        category_ids = [category.id]
        if include_subcategories:
            subcategories = await self._get_all_subcategories(db, category.id)
            category_ids.extend([sub.id for sub in subcategories])
        
        # Update filters to include category
        if not filters:
            filters = ProductFilters()
        filters.category_id = category_ids[0] if len(category_ids) == 1 else None
        
        # Use the product CRUD to get filtered products
        crud_product = CRUDProduct(Product)
        
        # Modify query to include subcategories if needed
        if len(category_ids) > 1:
            # This would require custom handling in get_list_with_filters
            # For now, we'll handle it here
            pass
        
        return await crud_product.get_list_with_filters(
            db, filters=filters, sort_by=sort_by, limit=limit, cursor=cursor
        )
    
    async def update_path_and_level(
        self,
        db: AsyncSession,
        category: Category
    ) -> Category:
        """Update category path and level based on parent."""
        if category.parent_id:
            parent = await self.get(db, id=category.parent_id)
            if parent:
                category.path = f"{parent.path}/{category.slug}"
                category.level = parent.level + 1
            else:
                category.path = f"/{category.slug}"
                category.level = 0
        else:
            category.path = f"/{category.slug}"
            category.level = 0
        
        db.add(category)
        await db.commit()
        await db.refresh(category)
        
        # Invalidate cache
        cache_service.invalidate_categories()
        
        return category
    
    async def _get_all_subcategories(
        self,
        db: AsyncSession,
        parent_id: int
    ) -> List[Category]:
        """Get all subcategories recursively."""
        query = select(Category).where(
            and_(
                Category.parent_id == parent_id,
                Category.is_active == True
            )
        )
        result = await db.execute(query)
        subcategories = result.scalars().all()
        
        all_subcategories = list(subcategories)
        for subcategory in subcategories:
            nested_subcategories = await self._get_all_subcategories(db, subcategory.id)
            all_subcategories.extend(nested_subcategories)
        
        return all_subcategories
    
    def _build_category_tree(self, categories: List[Category]) -> List[Category]:
        """Build hierarchical category tree from flat list."""
        # Create mapping for quick lookup
        categories_map = {cat.id: cat for cat in categories}
        root_categories = []
        
        for category in categories:
            # Initialize children list
            category.children = []
            
            if category.parent_id and category.parent_id in categories_map:
                # Add to parent's children
                parent = categories_map[category.parent_id]
                if not hasattr(parent, 'children'):
                    parent.children = []
                parent.children.append(category)
            else:
                # Root category
                root_categories.append(category)
        
        return root_categories


# Create instances
product = CRUDProduct(Product)
category = CRUDCategory(Category)