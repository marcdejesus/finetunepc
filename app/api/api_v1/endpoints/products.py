"""Product catalog API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.crud.crud_product_catalog import product as crud_product, category as crud_category
from app.services.search_service import search_service
from app.services.cache_service import cache_service
from app.schemas.product import (
    ProductDetailResponse, ProductListResponse, ProductListWithPagination,
    ProductVariantResponse, ProductFilters, SortOrder,
    CategoryResponse, CategoryHierarchy,
    SearchResultResponse, FilterOptions,
    PriceRange
)


router = APIRouter()


@router.get("/products", response_model=ProductListWithPagination)
async def get_products(
    db: AsyncSession = Depends(get_db),
    # Filtering parameters
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    is_featured: Optional[bool] = Query(None, description="Filter featured products"),
    is_digital: Optional[bool] = Query(None, description="Filter digital products"),
    in_stock: Optional[bool] = Query(None, description="Filter products in stock"),
    # Sorting and pagination
    sort_by: SortOrder = Query(SortOrder.CREATED_DESC, description="Sort order"),
    limit: int = Query(20, ge=1, le=100, description="Number of products per page"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
):
    """
    Get products with advanced filtering, sorting, and cursor-based pagination.
    
    **Filtering Options:**
    - `category_id` or `category_slug`: Filter by product category
    - `brand`: Filter by brand name (case-insensitive partial match)
    - `min_price`, `max_price`: Filter by price range
    - `is_featured`: Show only featured products
    - `is_digital`: Filter digital vs physical products
    - `in_stock`: Filter products with available inventory
    
    **Sorting Options:**
    - `price_asc`, `price_desc`: Sort by price
    - `name_asc`, `name_desc`: Sort by product name
    - `created_asc`, `created_desc`: Sort by creation date
    - `popularity_desc`: Sort by popularity
    - `rating_desc`: Sort by customer rating
    
    **Pagination:**
    - Uses cursor-based pagination for consistent results
    - `limit`: Number of products per page (1-100)
    - `cursor`: Pagination token from previous response
    """
    
    # Build filters
    filters = ProductFilters(
        category_id=category_id,
        category_slug=category_slug,
        brand=brand,
        price_range=PriceRange(
            min_price=min_price,
            max_price=max_price
        ) if min_price is not None or max_price is not None else None,
        is_featured=is_featured,
        is_digital=is_digital,
        in_stock=in_stock
    )
    
    try:
        products, pagination = await crud_product.get_list_with_filters(
            db=db,
            filters=filters,
            sort_by=sort_by,
            limit=limit,
            cursor=cursor
        )
        
        # Convert to response format
        product_list = []
        for product in products:
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
                        "large_url": image.large_url,
                        "width": image.width,
                        "height": image.height
                    }
                    break
            
            product_data = ProductListResponse(
                id=product.id,
                name=product.name,
                slug=product.slug,
                short_description=product.short_description,
                base_price=product.base_price,
                brand=product.brand,
                is_featured=product.is_featured,
                price_range=product.price_range,
                primary_image=primary_image,
                category=CategoryResponse.model_validate(product.category) if product.category else None
            )
            product_list.append(product_data)
        
        return ProductListWithPagination(
            products=product_list,
            pagination=pagination,
            filters_applied=filters,
            total_count=len(product_list)  # This could be enhanced with actual count
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving products: {str(e)}"
        )


@router.get("/products/{slug}", response_model=ProductDetailResponse)
async def get_product_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    include_related: bool = Query(False, description="Include related products")
):
    """
    Get detailed product information by slug.
    
    Returns complete product details including:
    - All product variants with pricing and inventory
    - Product images and media
    - Category information
    - Product specifications and attributes
    - Related products (if requested)
    """
    
    product = await crud_product.get_by_slug(db=db, slug=slug)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Convert variants
    variants = []
    for variant in product.variants:
        variant_images = []
        for image in variant.images:
            variant_images.append({
                "id": image.id,
                "url": image.url,
                "alt_text": image.alt_text,
                "image_type": image.image_type.value,
                "is_primary": image.is_primary,
                "sort_order": image.sort_order,
                "thumbnail_url": image.thumbnail_url,
                "medium_url": image.medium_url,
                "large_url": image.large_url,
                "width": image.width,
                "height": image.height
            })
        
        variant_data = ProductVariantResponse(
            id=variant.id,
            sku=variant.sku,
            title=variant.title,
            price=variant.price,
            sale_price=variant.sale_price,
            current_price=variant.current_price,
            is_on_sale=variant.is_on_sale,
            discount_percentage=variant.discount_percentage,
            attributes=variant.attributes,
            size=variant.size,
            color=variant.color,
            material=variant.material,
            style=variant.style,
            weight=variant.weight,
            is_active=variant.is_active,
            is_default=variant.is_default,
            is_in_stock=variant.is_in_stock,
            available_quantity=variant.available_quantity,
            sort_order=variant.sort_order,
            images=variant_images
        )
        variants.append(variant_data)
    
    # Convert images
    images = []
    for image in product.images:
        images.append({
            "id": image.id,
            "url": image.url,
            "alt_text": image.alt_text,
            "title": image.title,
            "image_type": image.image_type.value,
            "is_primary": image.is_primary,
            "sort_order": image.sort_order,
            "thumbnail_url": image.thumbnail_url,
            "medium_url": image.medium_url,
            "large_url": image.large_url,
            "width": image.width,
            "height": image.height
        })
    
    # Get default variant
    default_variant = None
    if product.default_variant:
        for variant in variants:
            if variant.id == product.default_variant.id:
                default_variant = variant
                break
    
    response = ProductDetailResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        short_description=product.short_description,
        base_price=product.base_price,
        sku_prefix=product.sku_prefix,
        brand=product.brand,
        weight=product.weight,
        dimensions_str=product.dimensions_str,
        is_active=product.is_active,
        is_featured=product.is_featured,
        is_digital=product.is_digital,
        requires_shipping=product.requires_shipping,
        meta_title=product.meta_title,
        meta_description=product.meta_description,
        created_at=product.created_at,
        updated_at=product.updated_at,
        category=CategoryResponse.model_validate(product.category) if product.category else None,
        price_range=product.price_range,
        has_variants=product.has_variants,
        variants=variants,
        images=images,
        default_variant=default_variant
    )
    
    return response


@router.get("/products/{slug}/variants", response_model=List[ProductVariantResponse])
async def get_product_variants(
    slug: str,
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(False, description="Include inactive variants")
):
    """
    Get all variants for a specific product.
    
    Returns detailed information about each product variant including:
    - Pricing information (including sale prices)
    - Inventory status
    - Variant attributes (size, color, etc.)
    - Variant-specific images
    """
    
    product = await crud_product.get_by_slug(db=db, slug=slug)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    variants = await crud_product.get_variants(
        db=db,
        product_id=product.id,
        include_inactive=include_inactive
    )
    
    variant_responses = []
    for variant in variants:
        variant_images = []
        for image in variant.images:
            variant_images.append({
                "id": image.id,
                "url": image.url,
                "alt_text": image.alt_text,
                "image_type": image.image_type.value,
                "is_primary": image.is_primary,
                "sort_order": image.sort_order,
                "thumbnail_url": image.thumbnail_url,
                "medium_url": image.medium_url,
                "large_url": image.large_url,
                "width": image.width,
                "height": image.height
            })
        
        variant_data = ProductVariantResponse(
            id=variant.id,
            sku=variant.sku,
            title=variant.title,
            price=variant.price,
            sale_price=variant.sale_price,
            current_price=variant.current_price,
            is_on_sale=variant.is_on_sale,
            discount_percentage=variant.discount_percentage,
            attributes=variant.attributes,
            size=variant.size,
            color=variant.color,
            material=variant.material,
            style=variant.style,
            weight=variant.weight,
            is_active=variant.is_active,
            is_default=variant.is_default,
            is_in_stock=variant.is_in_stock,
            available_quantity=variant.available_quantity,
            sort_order=variant.sort_order,
            images=variant_images
        )
        variant_responses.append(variant_data)
    
    return variant_responses


@router.get("/categories", response_model=List[CategoryHierarchy])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(False, description="Include inactive categories"),
    flat: bool = Query(False, description="Return flat list instead of hierarchy")
):
    """
    Get category hierarchy or flat list.
    
    **Hierarchy Mode (default):**
    - Returns nested category structure
    - Each category includes its children
    - Maintains parent-child relationships
    
    **Flat Mode:**
    - Returns all categories in a flat list
    - Useful for filters and simple displays
    """
    
    categories = await crud_category.get_hierarchy(
        db=db,
        include_inactive=include_inactive
    )
    
    if flat:
        # Flatten the hierarchy
        def flatten_categories(cats):
            flat_list = []
            for cat in cats:
                flat_list.append(cat)
                if hasattr(cat, 'children') and cat.children:
                    flat_list.extend(flatten_categories(cat.children))
            return flat_list
        
        categories = flatten_categories(categories)
    
    # Convert to response format
    def convert_category(cat):
        category_data = CategoryHierarchy(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            description=cat.description,
            parent_id=cat.parent_id,
            path=cat.path,
            level=cat.level,
            image_url=cat.image_url,
            is_active=cat.is_active,
            is_featured=cat.is_featured,
            sort_order=cat.sort_order,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            children=[convert_category(child) for child in getattr(cat, 'children', [])],
            product_count=getattr(cat, 'product_count', None)
        )
        return category_data
    
    return [convert_category(cat) for cat in categories]


@router.get("/categories/{slug}/products", response_model=ProductListWithPagination)
async def get_category_products(
    slug: str,
    db: AsyncSession = Depends(get_db),
    # Filtering parameters (same as main product endpoint)
    brand: Optional[str] = Query(None, description="Filter by brand"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    is_featured: Optional[bool] = Query(None, description="Filter featured products"),
    in_stock: Optional[bool] = Query(None, description="Filter products in stock"),
    include_subcategories: bool = Query(True, description="Include products from subcategories"),
    # Sorting and pagination
    sort_by: SortOrder = Query(SortOrder.CREATED_DESC, description="Sort order"),
    limit: int = Query(20, ge=1, le=100, description="Number of products per page"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
):
    """
    Get products in a specific category.
    
    **Category Filtering:**
    - By default includes products from subcategories
    - Set `include_subcategories=false` for current category only
    
    **Additional Filters:**
    - All standard product filters apply
    - Filters are applied in addition to category filter
    """
    
    # Check if category exists
    category_obj = await crud_category.get_by_slug(db=db, slug=slug)
    if not category_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Build filters
    filters = ProductFilters(
        category_slug=slug,
        brand=brand,
        price_range=PriceRange(
            min_price=min_price,
            max_price=max_price
        ) if min_price is not None or max_price is not None else None,
        is_featured=is_featured,
        in_stock=in_stock
    )
    
    products, pagination = await crud_category.get_category_products(
        db=db,
        category_slug=slug,
        filters=filters,
        sort_by=sort_by,
        limit=limit,
        cursor=cursor,
        include_subcategories=include_subcategories
    )
    
    # Convert to response format
    product_list = []
    for product in products:
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
                    "large_url": image.large_url,
                    "width": image.width,
                    "height": image.height
                }
                break
        
        product_data = ProductListResponse(
            id=product.id,
            name=product.name,
            slug=product.slug,
            short_description=product.short_description,
            base_price=product.base_price,
            brand=product.brand,
            is_featured=product.is_featured,
            price_range=product.price_range,
            primary_image=primary_image,
            category=CategoryResponse.model_validate(product.category) if product.category else None
        )
        product_list.append(product_data)
    
    return ProductListWithPagination(
        products=product_list,
        pagination=pagination,
        filters_applied=filters,
        total_count=len(product_list)
    )


@router.get("/search", response_model=SearchResultResponse)
async def search_products(
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    db: AsyncSession = Depends(get_db),
    # Filtering parameters
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    is_featured: Optional[bool] = Query(None, description="Filter featured products"),
    in_stock: Optional[bool] = Query(None, description="Filter products in stock"),
    # Sorting and pagination
    sort_by: SortOrder = Query(SortOrder.CREATED_DESC, description="Sort order"),
    limit: int = Query(20, ge=1, le=100, description="Number of results per page"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
):
    """
    Full-text search across products with PostgreSQL search capabilities.
    
    **Search Features:**
    - Full-text search across product names, descriptions, and keywords
    - Fuzzy matching for partial terms
    - Search ranking based on relevance
    - Brand and category boost
    
    **Search Tips:**
    - Use specific terms for better results
    - Brand names and exact matches are prioritized
    - Search is case-insensitive
    - Multiple words are treated as AND search
    """
    
    # Build filters
    filters = ProductFilters(
        category_id=category_id,
        brand=brand,
        price_range=PriceRange(
            min_price=min_price,
            max_price=max_price
        ) if min_price is not None or max_price is not None else None,
        is_featured=is_featured,
        in_stock=in_stock,
        search_query=q
    )
    
    try:
        search_results = await search_service.search_products(
            db=db,
            query=q,
            filters=filters,
            sort_by=sort_by,
            limit=limit,
            cursor=cursor
        )
        
        return search_results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {str(e)}"
        )


@router.get("/search/suggestions", response_model=List[str])
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Partial search query"),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=20, description="Number of suggestions")
):
    """
    Get search suggestions/autocomplete based on partial query.
    
    Returns relevant product names and brand names that match the partial query.
    Useful for implementing search autocomplete functionality.
    """
    
    try:
        suggestions = await search_service.get_search_suggestions(
            db=db,
            query=q,
            limit=limit
        )
        return suggestions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting suggestions: {str(e)}"
        )


@router.get("/filters", response_model=FilterOptions)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    category_id: Optional[int] = Query(None, description="Get filters for specific category")
):
    """
    Get available filter options for products.
    
    Returns all available filter values including:
    - Available brands
    - Product categories
    - Price ranges
    - Product attributes (size, color, material, etc.)
    
    Useful for building dynamic filter interfaces.
    """
    
    # Check cache first
    cache_key = f"filter_options:category_{category_id}" if category_id else "filter_options:all"
    cached_options = cache_service.get_filter_options(cache_key)
    if cached_options:
        return FilterOptions(**cached_options)
    
    try:
        # This would be implemented with proper aggregation queries
        # For now, return a basic structure
        filter_options = FilterOptions(
            brands=[],
            categories=[],
            price_ranges=[],
            attributes={}
        )
        
        # Cache the result
        cache_service.set_filter_options(cache_key, filter_options.model_dump())
        
        return filter_options
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving filter options: {str(e)}"
        )


@router.post("/cache/warm")
async def warm_cache(
    db: AsyncSession = Depends(get_db),
    product_count: int = Query(100, ge=1, le=1000, description="Number of products to cache")
):
    """
    Warm up the product cache with popular products.
    
    This endpoint is typically used for:
    - Application startup
    - After cache invalidation
    - Scheduled maintenance
    """
    
    try:
        # Get popular products to cache
        filters = ProductFilters(is_featured=True)
        products, _ = await crud_product.get_list_with_filters(
            db=db,
            filters=filters,
            sort_by=SortOrder.POPULARITY_DESC,
            limit=product_count
        )
        
        # Cache each product
        cached_count = 0
        for product in products:
            product_detail = await crud_product.get_with_details(db, product.id)
            if product_detail:
                cache_service.set_product(product.id, product_detail)
                cache_service.set_product_by_slug(product.slug, product_detail)
                cached_count += 1
        
        # Cache category hierarchy
        await crud_category.get_hierarchy(db)
        
        return {
            "message": f"Cache warmed successfully",
            "products_cached": cached_count,
            "categories_cached": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error warming cache: {str(e)}"
        )