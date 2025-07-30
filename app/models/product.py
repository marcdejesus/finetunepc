from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Index, Integer, DECIMAL
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("idx_categories_parent_id", "parent_id"),
        Index("idx_categories_name", "name"),
        Index("idx_categories_path", "path"),
        Index("idx_categories_level", "level"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Self-referential relationship fields
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    
    # Hierarchical fields for efficient queries
    path: Mapped[Optional[str]] = mapped_column(String(500))  # /parent/child/grandchild
    level: Mapped[int] = mapped_column(Integer, default=0)  # 0 = root level
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Category metadata
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # SEO fields
    meta_title: Mapped[Optional[str]] = mapped_column(String(200))
    meta_description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Self-referential relationships
    parent: Mapped[Optional["Category"]] = relationship(
        "Category", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Category"]] = relationship(
        "Category", back_populates="parent", cascade="all, delete-orphan"
    )
    
    # Product relationship
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="category"
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name}, level={self.level})>"

    @property
    def is_root(self) -> bool:
        """Check if this is a root category."""
        return self.parent_id is None

    @property
    def is_leaf(self) -> bool:
        """Check if this is a leaf category (has no children)."""
        return len(self.children) == 0

    def get_ancestors(self) -> list["Category"]:
        """Get all ancestor categories."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors

    def get_descendants(self) -> list["Category"]:
        """Get all descendant categories."""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants

    def update_path(self) -> None:
        """Update the path field based on the category hierarchy."""
        if self.parent:
            self.parent.update_path()
            self.path = f"{self.parent.path}/{self.slug}"
            self.level = self.parent.level + 1
        else:
            self.path = f"/{self.slug}"
            self.level = 0


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("idx_products_category_id", "category_id"),
        Index("idx_products_slug", "slug"),
        Index("idx_products_brand", "brand"),
        Index("idx_products_is_active", "is_active"),
        Index("idx_products_deleted_at", "deleted_at"),
        Index("idx_products_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(275), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    short_description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Base pricing (variants can override)
    base_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Product identification
    sku_prefix: Mapped[Optional[str]] = mapped_column(String(20))  # e.g., "TSHIRT"
    brand: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    
    # Physical attributes
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))  # in kg
    length: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))  # in cm
    width: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))   # in cm
    height: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))  # in cm
    
    # Product details
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id")
    )
    
    # Product status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_digital: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_shipping: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Performance metrics
    popularity_score: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2), default=0)
    rating_average: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(3, 2), default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    sales_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # SEO fields
    meta_title: Mapped[Optional[str]] = mapped_column(String(200))
    meta_description: Mapped[Optional[str]] = mapped_column(String(500))
    search_keywords: Mapped[Optional[str]] = mapped_column(Text)
    
    # Soft delete support
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    category: Mapped[Optional["Category"]] = relationship(
        "Category", back_populates="products"
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, slug={self.slug})>"

    @property
    def is_deleted(self) -> bool:
        """Check if the product is soft deleted."""
        return self.deleted_at is not None

    @property
    def dimensions_str(self) -> Optional[str]:
        """Return dimensions as formatted string."""
        if all([self.length, self.width, self.height]):
            return f"{self.length} x {self.width} x {self.height} cm"
        return None

    @property
    def has_variants(self) -> bool:
        """Check if product has variants."""
        return len(self.variants) > 0

    @property
    def default_variant(self) -> Optional["ProductVariant"]:
        """Get the default variant or first active variant."""
        if not self.variants:
            return None
        
        # Look for default variant first
        for variant in self.variants:
            if variant.is_default and variant.is_active:
                return variant
        
        # Fall back to first active variant
        for variant in self.variants:
            if variant.is_active:
                return variant
        
        return None

    @property
    def price_range(self) -> tuple[Decimal, Decimal]:
        """Get min and max price from all active variants."""
        if not self.variants:
            return self.base_price, self.base_price
        
        active_variants = [v for v in self.variants if v.is_active]
        if not active_variants:
            return self.base_price, self.base_price
        
        prices = [v.current_price for v in active_variants]
        return min(prices), max(prices)

    def soft_delete(self) -> None:
        """Soft delete the product."""
        self.deleted_at = datetime.utcnow()
        self.is_active = False

    def restore(self) -> None:
        """Restore a soft deleted product."""
        self.deleted_at = None
        self.is_active = True