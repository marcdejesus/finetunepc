from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from sqlalchemy import String, DateTime, Integer, ForeignKey, Index, DECIMAL, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Cart(Base):
    __tablename__ = "carts"
    __table_args__ = (
        Index("idx_carts_user_id", "user_id"),
        Index("idx_carts_session_id", "session_id"),
        Index("idx_carts_updated_at", "updated_at"),
        # Ensure one active cart per user or session
        UniqueConstraint("user_id", name="uq_cart_user_id"),
        UniqueConstraint("session_id", name="uq_cart_session_id"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    
    # User relationship (nullable for anonymous carts)
    user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True
    )
    
    # Session ID for anonymous users
    session_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, index=True
    )
    
    # Cart metadata
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    total_amount: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), default=Decimal("0.00")
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    
    # Expiration for anonymous carts
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship(
        "CartItem", back_populates="cart", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        identifier = self.user_id or self.session_id
        return f"<Cart(id={self.id}, identifier={identifier}, items={self.total_items})>"

    def is_anonymous(self) -> bool:
        """Check if this is an anonymous cart."""
        return self.user_id is None

    def is_expired(self) -> bool:
        """Check if the cart has expired (for anonymous carts)."""
        return (
            self.expires_at is not None and 
            datetime.utcnow() > self.expires_at
        )

    def calculate_totals(self) -> tuple[int, Decimal]:
        """Calculate and return total items and total amount."""
        total_items = sum(item.quantity for item in self.items)
        total_amount = sum(item.subtotal for item in self.items)
        return total_items, total_amount

    def update_totals(self) -> None:
        """Update the cart's total items and amount."""
        self.total_items, self.total_amount = self.calculate_totals()


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        Index("idx_cart_items_cart_id", "cart_id"),
        Index("idx_cart_items_variant_id", "variant_id"),
        # Ensure one item per variant per cart
        UniqueConstraint("cart_id", "variant_id", name="uq_cart_item_cart_variant"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    cart_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("carts.id"), nullable=False
    )
    variant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("product_variants.id"), nullable=False
    )
    
    # Item details
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Product/Variant snapshot (to preserve data if product changes)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    variant_title: Mapped[Optional[str]] = mapped_column(String(255))
    variant_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<CartItem(id={self.id}, product={self.product_name}, qty={self.quantity})>"

    @property
    def subtotal(self) -> Decimal:
        """Calculate the subtotal for this cart item."""
        return self.unit_price * self.quantity

    def update_from_variant(self, variant: "ProductVariant") -> None:
        """Update cart item details from the current variant."""
        self.unit_price = variant.current_price
        self.product_name = variant.product.name
        self.variant_title = variant.title
        self.variant_sku = variant.sku