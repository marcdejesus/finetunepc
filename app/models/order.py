from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Integer, DECIMAL, Text, CheckConstraint, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class OrderStatus(str, Enum):
    """Order status enumeration with comprehensive tracking."""
    DRAFT = "draft"                    # Cart not yet submitted
    PENDING = "pending"                # Order submitted, awaiting payment
    PAYMENT_PENDING = "payment_pending" # Payment initiated but not confirmed
    PAYMENT_FAILED = "payment_failed"   # Payment failed
    CONFIRMED = "confirmed"            # Payment confirmed, order processing
    PROCESSING = "processing"          # Order being prepared
    PARTIALLY_SHIPPED = "partially_shipped"  # Some items shipped
    SHIPPED = "shipped"                # All items shipped
    OUT_FOR_DELIVERY = "out_for_delivery"    # Out for delivery
    DELIVERED = "delivered"            # Successfully delivered
    PARTIALLY_REFUNDED = "partially_refunded"  # Partially refunded
    REFUNDED = "refunded"              # Fully refunded
    CANCELLED = "cancelled"            # Cancelled before shipping
    RETURNED = "returned"              # Returned after delivery
    DISPUTED = "disputed"              # Under dispute/chargeback


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_id", "user_id"),
        Index("idx_orders_order_number", "order_number"),
        Index("idx_orders_status", "status"),
        Index("idx_orders_created_at", "created_at"),
        Index("idx_orders_stripe_payment_intent_id", "stripe_payment_intent_id"),
        Index("idx_orders_coupon_id", "coupon_id"),
        CheckConstraint("subtotal >= 0", name="ck_order_subtotal_positive"),
        CheckConstraint("tax_amount >= 0", name="ck_order_tax_positive"),
        CheckConstraint("shipping_amount >= 0", name="ck_order_shipping_positive"),
        CheckConstraint("total_amount >= 0", name="ck_order_total_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    
    # Order identification
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False
    )
    
    # Order status and tracking
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus), default=OrderStatus.DRAFT
    )
    
    # Price breakdown
    subtotal: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=Decimal("0.00"))
    tax_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=Decimal("0.00"))
    shipping_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=Decimal("0.00"))
    discount_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Currency
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    
    # Address references
    billing_address_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("addresses.id")
    )
    shipping_address_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("addresses.id")
    )
    
    # Stripe integration
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Coupon/discount
    coupon_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("coupons.id")
    )
    coupon_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Order metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Fulfillment tracking
    estimated_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="orders")
    billing_address: Mapped[Optional["Address"]] = relationship(
        "Address", foreign_keys=[billing_address_id]
    )
    shipping_address: Mapped[Optional["Address"]] = relationship(
        "Address", foreign_keys=[shipping_address_id]
    )
    coupon: Mapped[Optional["Coupon"]] = relationship("Coupon", back_populates="orders")
    order_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="order", cascade="all, delete-orphan"
    )
    refunds: Mapped[list["Refund"]] = relationship(
        "Refund", back_populates="order", cascade="all, delete-orphan"
    )
    shipments: Mapped[list["Shipment"]] = relationship(
        "Shipment", back_populates="order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Order(number={self.order_number}, status={self.status}, total={self.total_amount})>"

    @property
    def is_paid(self) -> bool:
        """Check if the order has been fully paid."""
        return any(p.status == "succeeded" for p in self.payments)

    @property
    def is_refundable(self) -> bool:
        """Check if the order can be refunded."""
        return self.status in [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, 
                              OrderStatus.SHIPPED, OrderStatus.DELIVERED]

    @property
    def is_cancellable(self) -> bool:
        """Check if the order can be cancelled."""
        return self.status in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]

    @property
    def total_paid(self) -> Decimal:
        """Calculate total amount paid."""
        return sum(p.amount for p in self.payments if p.status == "succeeded")

    @property
    def total_refunded(self) -> Decimal:
        """Calculate total amount refunded."""
        return sum(r.amount for r in self.refunds if r.status == "succeeded")

    @property
    def net_amount(self) -> Decimal:
        """Calculate net amount (paid - refunded)."""
        return self.total_paid - self.total_refunded

    def calculate_totals(self) -> None:
        """Recalculate order totals from order items."""
        self.subtotal = sum(item.line_total for item in self.order_items)
        
        # Apply coupon discount if present
        if self.coupon:
            self.discount_amount = self.coupon.calculate_discount(self.subtotal)
        
        # Calculate total
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_amount - self.discount_amount

    def can_transition_to(self, new_status: OrderStatus) -> bool:
        """Check if order can transition to new status."""
        valid_transitions = {
            OrderStatus.DRAFT: [OrderStatus.PENDING, OrderStatus.CANCELLED],
            OrderStatus.PENDING: [OrderStatus.PAYMENT_PENDING, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
            OrderStatus.PAYMENT_PENDING: [OrderStatus.CONFIRMED, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
            OrderStatus.PAYMENT_FAILED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.PARTIALLY_SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
            OrderStatus.PARTIALLY_SHIPPED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.PARTIALLY_REFUNDED],
            OrderStatus.SHIPPED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED],
            OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
            OrderStatus.DELIVERED: [OrderStatus.RETURNED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.REFUNDED],
            OrderStatus.PARTIALLY_REFUNDED: [OrderStatus.REFUNDED, OrderStatus.RETURNED],
            OrderStatus.REFUNDED: [],
            OrderStatus.CANCELLED: [],
            OrderStatus.RETURNED: [OrderStatus.REFUNDED],
            OrderStatus.DISPUTED: [OrderStatus.REFUNDED, OrderStatus.CANCELLED]
        }
        
        return new_status in valid_transitions.get(self.status, [])

    def transition_to(self, new_status: OrderStatus, notes: Optional[str] = None) -> bool:
        """Transition order to new status if valid."""
        if not self.can_transition_to(new_status):
            return False
        
        old_status = self.status
        self.status = new_status
        
        # Handle status-specific logic
        if new_status == OrderStatus.DELIVERED:
            self.delivered_at = datetime.utcnow()
        
        if notes:
            if self.internal_notes:
                self.internal_notes += f"\n{datetime.utcnow()}: {old_status} -> {new_status}: {notes}"
            else:
                self.internal_notes = f"{datetime.utcnow()}: {old_status} -> {new_status}: {notes}"
        
        return True

    def generate_order_number(self) -> str:
        """Generate a unique order number."""
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d")
        # In a real implementation, you'd want to ensure uniqueness
        return f"ORD-{timestamp}-{str(self.id)[:8].upper()}"


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        Index("idx_order_items_order_id", "order_id"),
        Index("idx_order_items_variant_id", "variant_id"),
        CheckConstraint("quantity > 0", name="ck_order_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_order_item_price_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    order_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("orders.id"), nullable=False
    )
    variant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("product_variants.id"), nullable=False
    )
    
    # Quantity and pricing
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Denormalized product data (preserved at time of order)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_slug: Mapped[str] = mapped_column(String(275), nullable=False)
    variant_title: Mapped[Optional[str]] = mapped_column(String(255))
    variant_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Product attributes at time of purchase
    product_brand: Mapped[Optional[str]] = mapped_column(String(100))
    variant_attributes: Mapped[Optional[str]] = mapped_column(Text)  # JSON string of attributes
    
    # Image for order history
    product_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Weight for shipping calculations
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))
    
    # Fulfillment tracking
    shipped_quantity: Mapped[int] = mapped_column(Integer, default=0)
    refunded_quantity: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="order_items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<OrderItem(product={self.product_name}, variant={self.variant_title}, qty={self.quantity})>"

    @property
    def line_total(self) -> Decimal:
        """Calculate line total (quantity * unit_price)."""
        return self.unit_price * self.quantity

    @property
    def remaining_quantity(self) -> int:
        """Calculate quantity not yet shipped or refunded."""
        return self.quantity - self.shipped_quantity - self.refunded_quantity

    @property
    def is_fully_shipped(self) -> bool:
        """Check if item is fully shipped."""
        return self.shipped_quantity >= self.quantity

    @property
    def is_fully_refunded(self) -> bool:
        """Check if item is fully refunded."""
        return self.refunded_quantity >= self.quantity

    def update_from_variant(self, variant: "ProductVariant") -> None:
        """Update denormalized data from current variant."""
        self.unit_price = variant.current_price
        self.product_name = variant.product.name
        self.product_slug = variant.product.slug
        self.variant_title = variant.title
        self.variant_sku = variant.sku
        self.product_brand = variant.product.brand
        self.weight = variant.effective_weight
        
        # Get primary image
        if variant.images:
            primary_image = next((img for img in variant.images if img.is_primary), None)
            if primary_image:
                self.product_image_url = primary_image.url
        elif variant.product.images:
            primary_image = next((img for img in variant.product.images if img.is_primary), None)
            if primary_image:
                self.product_image_url = primary_image.url