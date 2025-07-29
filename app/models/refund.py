from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Index, DECIMAL, Text, CheckConstraint, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.core.database import Base


class RefundStatus(str, Enum):
    """Refund status enumeration matching Stripe refund statuses."""
    PENDING = "pending"                # Refund initiated but not processed
    PROCESSING = "processing"          # Refund being processed
    SUCCEEDED = "succeeded"            # Refund successful
    FAILED = "failed"                  # Refund failed
    CANCELLED = "cancelled"            # Refund cancelled


class RefundReason(str, Enum):
    """Refund reason enumeration."""
    REQUESTED_BY_CUSTOMER = "requested_by_customer"
    DUPLICATE = "duplicate"
    FRAUDULENT = "fraudulent"
    SUBSCRIPTION_CANCELED = "subscription_canceled"
    PRODUCT_UNACCEPTABLE = "product_unacceptable"
    NO_LONGER_AVAILABLE = "no_longer_available"
    OTHER = "other"


class Refund(Base):
    __tablename__ = "refunds"
    __table_args__ = (
        Index("idx_refunds_order_id", "order_id"),
        Index("idx_refunds_payment_id", "payment_id"),
        Index("idx_refunds_stripe_refund_id", "stripe_refund_id"),
        Index("idx_refunds_status", "status"),
        Index("idx_refunds_created_at", "created_at"),
        Index("idx_refunds_reason", "reason"),
        CheckConstraint("amount > 0", name="ck_refund_amount_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    order_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("orders.id"), nullable=False
    )
    payment_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("payments.id")
    )
    
    # Refund details
    amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    
    # Refund status and reason
    status: Mapped[RefundStatus] = mapped_column(
        SQLEnum(RefundStatus), nullable=False, default=RefundStatus.PENDING
    )
    reason: Mapped[RefundReason] = mapped_column(
        SQLEnum(RefundReason), nullable=False
    )
    
    # Stripe integration
    stripe_refund_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True
    )
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Gateway response data
    gateway_response: Mapped[Optional[dict]] = mapped_column(JSON)
    gateway_transaction_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Refund metadata
    description: Mapped[Optional[str]] = mapped_column(String(500))
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    customer_note: Mapped[Optional[str]] = mapped_column(Text)
    
    # Failure information
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255))
    failure_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Processing information
    processed_by: Mapped[Optional[str]] = mapped_column(String(255))  # User ID or system
    
    # Timestamps
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="refunds")
    payment: Mapped[Optional["Payment"]] = relationship("Payment")

    def __repr__(self) -> str:
        return f"<Refund(id={self.id}, amount={self.amount}, status={self.status})>"

    @property
    def is_successful(self) -> bool:
        """Check if refund was successful."""
        return self.status == RefundStatus.SUCCEEDED

    @property
    def is_failed(self) -> bool:
        """Check if refund failed."""
        return self.status == RefundStatus.FAILED

    @property
    def is_pending(self) -> bool:
        """Check if refund is pending."""
        return self.status in [RefundStatus.PENDING, RefundStatus.PROCESSING]

    @property
    def can_be_cancelled(self) -> bool:
        """Check if refund can be cancelled."""
        return self.status in [RefundStatus.PENDING, RefundStatus.PROCESSING]

    def update_from_stripe_refund(self, refund: dict) -> None:
        """Update refund from Stripe Refund object."""
        self.stripe_refund_id = refund.get("id")
        self.amount = Decimal(str(refund.get("amount", 0) / 100))  # Convert from cents
        self.currency = refund.get("currency", "usd").upper()
        self.status = RefundStatus(refund.get("status", "pending"))
        
        # Update gateway response
        self.gateway_response = refund
        
        # Extract charge and payment intent IDs
        if refund.get("charge"):
            self.stripe_charge_id = refund["charge"]
        if refund.get("payment_intent"):
            self.stripe_payment_intent_id = refund["payment_intent"]
        
        # Update failure information if applicable
        if refund.get("failure_reason"):
            self.failure_reason = refund["failure_reason"]
        
        # Update timestamps based on status
        now = datetime.utcnow()
        if self.status == RefundStatus.SUCCEEDED and not self.processed_at:
            self.processed_at = now
        elif self.status == RefundStatus.FAILED and not self.failed_at:
            self.failed_at = now

    def mark_as_succeeded(self, stripe_refund_id: Optional[str] = None) -> None:
        """Mark refund as succeeded."""
        self.status = RefundStatus.SUCCEEDED
        self.processed_at = datetime.utcnow()
        if stripe_refund_id:
            self.stripe_refund_id = stripe_refund_id

    def mark_as_failed(self, failure_reason: Optional[str] = None, failure_code: Optional[str] = None) -> None:
        """Mark refund as failed."""
        self.status = RefundStatus.FAILED
        self.failed_at = datetime.utcnow()
        if failure_reason:
            self.failure_reason = failure_reason
        if failure_code:
            self.failure_code = failure_code

    def cancel(self, reason: Optional[str] = None) -> bool:
        """Cancel the refund if possible."""
        if not self.can_be_cancelled:
            return False
        
        self.status = RefundStatus.CANCELLED
        if reason:
            if self.internal_notes:
                self.internal_notes += f"\n{datetime.utcnow()}: Cancelled - {reason}"
            else:
                self.internal_notes = f"{datetime.utcnow()}: Cancelled - {reason}"
        
        return True

    def add_internal_note(self, note: str, user_id: Optional[str] = None) -> None:
        """Add an internal note to the refund."""
        timestamp = datetime.utcnow()
        user_info = f" by {user_id}" if user_id else ""
        note_entry = f"{timestamp}{user_info}: {note}"
        
        if self.internal_notes:
            self.internal_notes += f"\n{note_entry}"
        else:
            self.internal_notes = note_entry

    @classmethod
    def create_from_payment(cls, payment: "Payment", amount: Optional[Decimal] = None, 
                           reason: RefundReason = RefundReason.REQUESTED_BY_CUSTOMER,
                           description: Optional[str] = None) -> "Refund":
        """Create a refund from a payment."""
        refund_amount = amount or payment.amount
        
        refund = cls(
            order_id=payment.order_id,
            payment_id=payment.id,
            amount=refund_amount,
            currency=payment.currency,
            reason=reason,
            description=description,
            stripe_payment_intent_id=payment.stripe_payment_intent_id,
            stripe_charge_id=payment.stripe_charge_id
        )
        
        return refund

    def get_refund_summary(self) -> dict:
        """Get a summary of the refund for API responses."""
        return {
            "id": self.id,
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status.value,
            "reason": self.reason.value,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "stripe_refund_id": self.stripe_refund_id
        }