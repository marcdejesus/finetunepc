from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Integer, DECIMAL, Text, Index, CheckConstraint, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class CouponType(str, Enum):
    """Coupon type enumeration."""
    PERCENTAGE = "percentage"    # Percentage discount
    FIXED_AMOUNT = "fixed_amount"  # Fixed amount discount
    FREE_SHIPPING = "free_shipping"  # Free shipping
    BOGO = "bogo"               # Buy one get one


class Coupon(Base):
    __tablename__ = "coupons"
    __table_args__ = (
        Index("idx_coupons_code", "code"),
        Index("idx_coupons_is_active", "is_active"),
        Index("idx_coupons_valid_from", "valid_from"),
        Index("idx_coupons_valid_until", "valid_until"),
        CheckConstraint("usage_limit >= 0", name="ck_coupon_usage_limit_positive"),
        CheckConstraint("minimum_order_amount >= 0", name="ck_coupon_min_order_positive"),
        CheckConstraint("maximum_discount_amount >= 0", name="ck_coupon_max_discount_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    
    # Coupon identification
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Coupon type and value
    coupon_type: Mapped[CouponType] = mapped_column(
        SQLEnum(CouponType), nullable=False
    )
    discount_value: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    
    # Constraints
    minimum_order_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    maximum_discount_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    
    # Usage limits
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer)
    usage_limit_per_customer: Mapped[Optional[int]] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Validity period
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="coupon")

    def __repr__(self) -> str:
        return f"<Coupon(code={self.code}, type={self.coupon_type}, value={self.discount_value})>"

    def is_valid(self, order_amount: Optional[Decimal] = None) -> bool:
        """Check if the coupon is currently valid."""
        now = datetime.utcnow()
        
        # Check if active
        if not self.is_active:
            return False
        
        # Check validity period
        if now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        
        # Check usage limit
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        
        # Check minimum order amount
        if order_amount and self.minimum_order_amount:
            if order_amount < self.minimum_order_amount:
                return False
        
        return True

    def calculate_discount(self, order_amount: Decimal) -> Decimal:
        """Calculate the discount amount for the given order amount."""
        if not self.is_valid(order_amount):
            return Decimal("0.00")
        
        if self.coupon_type == CouponType.PERCENTAGE:
            discount = (order_amount * self.discount_value) / 100
        elif self.coupon_type == CouponType.FIXED_AMOUNT:
            discount = self.discount_value
        elif self.coupon_type == CouponType.FREE_SHIPPING:
            # This would be handled separately in shipping calculation
            return Decimal("0.00")
        else:
            discount = Decimal("0.00")
        
        # Apply maximum discount limit
        if self.maximum_discount_amount:
            discount = min(discount, self.maximum_discount_amount)
        
        # Don't exceed order amount
        discount = min(discount, order_amount)
        
        return discount

    def increment_usage(self) -> None:
        """Increment the usage count."""
        self.used_count += 1