from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Integer, DECIMAL, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.core.database import Base


class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        Index("idx_product_variants_product_id", "product_id"),
        Index("idx_product_variants_sku", "sku"),
        Index("idx_product_variants_is_active", "is_active"),
        Index("idx_product_variants_is_default", "is_default"),
        Index("idx_product_variants_price", "price"),
        Index("idx_product_variants_stripe_price_id", "stripe_price_id"),
        UniqueConstraint("sku", name="uq_product_variant_sku"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("products.id"), nullable=False
    )
    
    # Variant identification
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Variant attributes (JSON for flexibility)
    attributes: Mapped[Optional[dict]] = mapped_column(JSON)  # {"size": "M", "color": "Red", "material": "Cotton"}
    
    # Individual attribute fields for common filtering
    size: Mapped[Optional[str]] = mapped_column(String(50))
    color: Mapped[Optional[str]] = mapped_column(String(50))
    material: Mapped[Optional[str]] = mapped_column(String(100))
    style: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Variant display
    title: Mapped[Optional[str]] = mapped_column(String(255))  # e.g., "Medium / Red / Cotton"
    display_name: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Pricing
    price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    sale_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    cost_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    
    # Stripe integration
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    stripe_product_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Physical attributes (can override product defaults)
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))
    length: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))
    width: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))
    height: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2))
    
    # Variant status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Sale period
    sale_start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sale_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    inventory: Mapped[Optional["Inventory"]] = relationship(
        "Inventory", back_populates="variant", uselist=False, cascade="all, delete-orphan"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="variant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ProductVariant(id={self.id}, sku={self.sku}, title={self.title})>"

    @property
    def current_price(self) -> Decimal:
        """Get the current effective price (sale or regular)."""
        if self.is_on_sale:
            return self.sale_price
        return self.price

    @property
    def is_on_sale(self) -> bool:
        """Check if the variant is currently on sale."""
        if not self.sale_price or self.sale_price >= self.price:
            return False
        
        now = datetime.utcnow()
        
        # Check sale period
        if self.sale_start_date and now < self.sale_start_date:
            return False
        if self.sale_end_date and now > self.sale_end_date:
            return False
        
        return True

    @property
    def discount_amount(self) -> Optional[Decimal]:
        """Calculate the discount amount if on sale."""
        if self.is_on_sale:
            return self.price - self.sale_price
        return None

    @property
    def discount_percentage(self) -> Optional[Decimal]:
        """Calculate the discount percentage if on sale."""
        if self.is_on_sale and self.sale_price:
            return ((self.price - self.sale_price) / self.price) * 100
        return None

    @property
    def is_in_stock(self) -> bool:
        """Check if the variant is in stock."""
        if not self.inventory:
            return False
        return self.inventory.available_quantity > 0

    @property
    def available_quantity(self) -> int:
        """Get available quantity from inventory."""
        if not self.inventory:
            return 0
        return self.inventory.available_quantity

    @property
    def dimensions_str(self) -> str:
        """Return dimensions as formatted string, falling back to product dimensions."""
        # Use variant dimensions if available
        if all([self.length, self.width, self.height]):
            return f"{self.length} x {self.width} x {self.height} cm"
        
        # Fall back to product dimensions
        if self.product and self.product.dimensions_str:
            return self.product.dimensions_str
        
        return "Dimensions not specified"

    @property
    def effective_weight(self) -> Optional[Decimal]:
        """Get effective weight, falling back to product weight."""
        return self.weight or (self.product.weight if self.product else None)

    def generate_title(self) -> str:
        """Generate a title from variant attributes."""
        parts = []
        if self.size:
            parts.append(self.size)
        if self.color:
            parts.append(self.color)
        if self.material:
            parts.append(self.material)
        if self.style:
            parts.append(self.style)
        
        return " / ".join(parts) if parts else f"Variant {self.id[:8]}"

    def generate_sku(self, base_sku: Optional[str] = None) -> str:
        """Generate SKU from product SKU prefix and variant attributes."""
        base = base_sku or self.product.sku_prefix or "PROD"
        
        parts = [base]
        if self.size:
            parts.append(self.size.upper().replace(" ", ""))
        if self.color:
            parts.append(self.color.upper().replace(" ", "")[:3])
        if self.material:
            parts.append(self.material.upper().replace(" ", "")[:3])
        
        return "-".join(parts)

    def update_attributes_from_json(self, attributes_dict: dict) -> None:
        """Update individual attribute fields from JSON attributes."""
        if not attributes_dict:
            return
        
        self.attributes = attributes_dict
        self.size = attributes_dict.get("size")
        self.color = attributes_dict.get("color")
        self.material = attributes_dict.get("material")
        self.style = attributes_dict.get("style")
        
        # Auto-generate title if not provided
        if not self.title:
            self.title = self.generate_title()

    def set_sale_period(self, start_date: datetime, end_date: datetime, sale_price: Decimal) -> None:
        """Set up a sale period for this variant."""
        self.sale_start_date = start_date
        self.sale_end_date = end_date
        self.sale_price = sale_price

    def clear_sale(self) -> None:
        """Clear the sale pricing."""
        self.sale_price = None
        self.sale_start_date = None
        self.sale_end_date = None