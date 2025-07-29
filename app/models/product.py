from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Index, Integer, DECIMAL
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
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
        Index("idx_products_sku", "sku"),
        Index("idx_products_price", "price"),
        Index("idx_products_is_active", "is_active"),
        Index("idx_products_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(275), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    short_description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Pricing
    price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    compare_at_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    cost_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    
    # Inventory
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_backorder: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Product details
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id")
    )
    sku: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100))
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))
    dimensions: Mapped[Optional[str]] = mapped_column(String(100))  # LxWxH
    
    # Product status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_digital: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # SEO fields
    meta_title: Mapped[Optional[str]] = mapped_column(String(200))
    meta_description: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Media
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    gallery_images: Mapped[Optional[str]] = mapped_column(Text)  # JSON array of URLs
    
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
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, price={self.price})>"

    @property
    def is_in_stock(self) -> bool:
        """Check if the product is in stock."""
        if not self.track_inventory:
            return True
        return self.stock_quantity > 0 or self.allow_backorder

    @property
    def is_on_sale(self) -> bool:
        """Check if the product is on sale."""
        return (
            self.compare_at_price is not None and 
            self.compare_at_price > self.price
        )

    @property
    def discount_amount(self) -> Optional[Decimal]:
        """Calculate the discount amount if on sale."""
        if self.is_on_sale:
            return self.compare_at_price - self.price
        return None

    @property
    def discount_percentage(self) -> Optional[Decimal]:
        """Calculate the discount percentage if on sale."""
        if self.is_on_sale and self.compare_at_price:
            return ((self.compare_at_price - self.price) / self.compare_at_price) * 100
        return None