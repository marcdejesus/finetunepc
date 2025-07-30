from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum


class ImageType(str, Enum):
    """Image type enumeration."""
    MAIN = "main"
    GALLERY = "gallery"
    THUMBNAIL = "thumbnail"
    VARIANT = "variant"
    ZOOM = "zoom"
    LIFESTYLE = "lifestyle"
    DETAIL = "detail"


class SortOrder(str, Enum):
    """Sort order enumeration."""
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    POPULARITY_DESC = "popularity_desc"
    RATING_DESC = "rating_desc"


# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=120)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = True
    is_featured: bool = False
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = Field(None, max_length=500)
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    slug: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = Field(None, max_length=500)
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    path: Optional[str] = None
    level: int
    image_url: Optional[str] = None
    is_active: bool
    is_featured: bool
    sort_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class CategoryHierarchy(CategoryResponse):
    """Category with children for hierarchical display."""
    children: List["CategoryHierarchy"] = []
    product_count: Optional[int] = None


# Product Image Schemas
class ProductImageBase(BaseModel):
    url: str = Field(..., max_length=500)
    alt_text: Optional[str] = Field(None, max_length=255)
    title: Optional[str] = Field(None, max_length=255)
    image_type: ImageType = ImageType.GALLERY
    is_primary: bool = False
    sort_order: int = 0


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    url: str
    alt_text: Optional[str] = None
    title: Optional[str] = None
    image_type: str
    is_primary: bool
    sort_order: int
    thumbnail_url: Optional[str] = None
    medium_url: Optional[str] = None
    large_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


# Product Variant Schemas
class ProductVariantBase(BaseModel):
    sku: str = Field(..., max_length=100)
    title: Optional[str] = Field(None, max_length=255)
    price: Decimal = Field(..., gt=0)
    sale_price: Optional[Decimal] = Field(None, gt=0)
    attributes: Optional[Dict[str, Any]] = None
    size: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=50)
    material: Optional[str] = Field(None, max_length=100)
    style: Optional[str] = Field(None, max_length=100)
    weight: Optional[Decimal] = None
    is_active: bool = True
    is_default: bool = False
    sort_order: int = 0


class ProductVariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    sku: str
    title: Optional[str] = None
    price: Decimal
    sale_price: Optional[Decimal] = None
    current_price: Decimal
    is_on_sale: bool
    discount_percentage: Optional[Decimal] = None
    attributes: Optional[Dict[str, Any]] = None
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    style: Optional[str] = None
    weight: Optional[Decimal] = None
    is_active: bool
    is_default: bool
    is_in_stock: bool
    available_quantity: int
    sort_order: int
    images: List[ProductImageResponse] = []


# Product Schemas
class ProductBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=275)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    base_price: Decimal = Field(..., gt=0)
    sku_prefix: Optional[str] = Field(None, max_length=20)
    brand: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    weight: Optional[Decimal] = None
    length: Optional[Decimal] = None
    width: Optional[Decimal] = None
    height: Optional[Decimal] = None
    is_active: bool = True
    is_featured: bool = False
    is_digital: bool = False
    requires_shipping: bool = True
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = Field(None, max_length=500)
    search_keywords: Optional[str] = None


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantBase]] = []
    images: Optional[List[ProductImageBase]] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=275)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    base_price: Optional[Decimal] = Field(None, gt=0)
    sku_prefix: Optional[str] = Field(None, max_length=20)
    brand: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    weight: Optional[Decimal] = None
    length: Optional[Decimal] = None
    width: Optional[Decimal] = None
    height: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_digital: Optional[bool] = None
    requires_shipping: Optional[bool] = None
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = Field(None, max_length=500)
    search_keywords: Optional[str] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    base_price: Decimal
    sku_prefix: Optional[str] = None
    brand: Optional[str] = None
    weight: Optional[Decimal] = None
    dimensions_str: Optional[str] = None
    is_active: bool
    is_featured: bool
    is_digital: bool
    requires_shipping: bool
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[CategoryResponse] = None
    price_range: tuple[Decimal, Decimal]
    has_variants: bool


class ProductDetailResponse(ProductResponse):
    """Detailed product response with variants and images."""
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []
    default_variant: Optional[ProductVariantResponse] = None


class ProductListResponse(BaseModel):
    """Product list with minimal data for catalog display."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    slug: str
    short_description: Optional[str] = None
    base_price: Decimal
    brand: Optional[str] = None
    is_featured: bool
    price_range: tuple[Decimal, Decimal]
    primary_image: Optional[ProductImageResponse] = None
    category: Optional[CategoryResponse] = None


# Filter and Search Schemas
class PriceRange(BaseModel):
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None


class ProductFilters(BaseModel):
    category_id: Optional[int] = None
    category_slug: Optional[str] = None
    brand: Optional[str] = None
    price_range: Optional[PriceRange] = None
    attributes: Optional[Dict[str, Any]] = None
    is_featured: Optional[bool] = None
    is_digital: Optional[bool] = None
    in_stock: Optional[bool] = None
    search_query: Optional[str] = None


class ProductSearch(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[ProductFilters] = None
    sort_by: SortOrder = SortOrder.CREATED_DESC
    limit: int = Field(20, ge=1, le=100)
    cursor: Optional[str] = None


class CursorPagination(BaseModel):
    cursor: Optional[str] = None
    has_next: bool = False
    has_previous: bool = False
    total_count: Optional[int] = None


class ProductListWithPagination(BaseModel):
    products: List[ProductListResponse]
    pagination: CursorPagination
    filters_applied: Optional[ProductFilters] = None
    total_count: int = 0


class SearchResultResponse(BaseModel):
    products: List[ProductListResponse]
    pagination: CursorPagination
    search_query: str
    filters_applied: Optional[ProductFilters] = None
    total_count: int = 0
    search_time_ms: Optional[float] = None


# Filter Option Schemas
class FilterOption(BaseModel):
    value: str
    label: str
    count: int


class FilterOptions(BaseModel):
    brands: List[FilterOption] = []
    categories: List[FilterOption] = []
    price_ranges: List[FilterOption] = []
    attributes: Dict[str, List[FilterOption]] = {}


# Update forward references
CategoryHierarchy.model_rebuild()