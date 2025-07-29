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


class PaymentStatus(str, Enum):
    """Payment status enumeration matching Stripe payment statuses."""
    PENDING = "pending"                # Payment initiated but not processed
    PROCESSING = "processing"          # Payment being processed
    REQUIRES_PAYMENT_METHOD = "requires_payment_method"  # Needs payment method
    REQUIRES_CONFIRMATION = "requires_confirmation"      # Needs confirmation
    REQUIRES_ACTION = "requires_action"                  # Needs 3D Secure or similar
    SUCCEEDED = "succeeded"            # Payment successful
    FAILED = "failed"                  # Payment failed
    CANCELLED = "cancelled"            # Payment cancelled
    EXPIRED = "expired"                # Payment expired


class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    CARD = "card"                      # Credit/debit card
    BANK_TRANSFER = "bank_transfer"    # Bank transfer
    PAYPAL = "paypal"                  # PayPal
    APPLE_PAY = "apple_pay"            # Apple Pay
    GOOGLE_PAY = "google_pay"          # Google Pay
    KLARNA = "klarna"                  # Klarna
    AFTERPAY = "afterpay"              # Afterpay
    CASH = "cash"                      # Cash payment
    OTHER = "other"                    # Other methods


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("idx_payments_order_id", "order_id"),
        Index("idx_payments_stripe_payment_intent_id", "stripe_payment_intent_id"),
        Index("idx_payments_stripe_charge_id", "stripe_charge_id"),
        Index("idx_payments_status", "status"),
        Index("idx_payments_created_at", "created_at"),
        Index("idx_payments_payment_method", "payment_method"),
        CheckConstraint("amount > 0", name="ck_payment_amount_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    order_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("orders.id"), nullable=False
    )
    
    # Payment amounts
    amount: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    
    # Payment method and status
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SQLEnum(PaymentMethod), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING
    )
    
    # Stripe integration
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True
    )
    stripe_charge_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_payment_method_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Gateway response data
    gateway_response: Mapped[Optional[dict]] = mapped_column(JSON)
    gateway_transaction_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Payment details
    description: Mapped[Optional[str]] = mapped_column(String(500))
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255))
    failure_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Card details (if applicable)
    card_last_four: Mapped[Optional[str]] = mapped_column(String(4))
    card_brand: Mapped[Optional[str]] = mapped_column(String(20))
    card_exp_month: Mapped[Optional[int]] = mapped_column()
    card_exp_year: Mapped[Optional[int]] = mapped_column()
    
    # Risk assessment
    risk_score: Mapped[Optional[int]] = mapped_column()  # 0-100
    risk_level: Mapped[Optional[str]] = mapped_column(String(20))  # low, medium, high
    
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
    order: Mapped["Order"] = relationship("Order", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, amount={self.amount}, status={self.status})>"

    @property
    def is_successful(self) -> bool:
        """Check if payment was successful."""
        return self.status == PaymentStatus.SUCCEEDED

    @property
    def is_failed(self) -> bool:
        """Check if payment failed."""
        return self.status == PaymentStatus.FAILED

    @property
    def is_pending(self) -> bool:
        """Check if payment is pending."""
        return self.status in [
            PaymentStatus.PENDING,
            PaymentStatus.PROCESSING,
            PaymentStatus.REQUIRES_PAYMENT_METHOD,
            PaymentStatus.REQUIRES_CONFIRMATION,
            PaymentStatus.REQUIRES_ACTION
        ]

    @property
    def requires_action(self) -> bool:
        """Check if payment requires customer action."""
        return self.status in [
            PaymentStatus.REQUIRES_PAYMENT_METHOD,
            PaymentStatus.REQUIRES_CONFIRMATION,
            PaymentStatus.REQUIRES_ACTION
        ]

    @property
    def masked_card_number(self) -> Optional[str]:
        """Get masked card number if available."""
        if self.card_last_four and self.card_brand:
            return f"**** **** **** {self.card_last_four}"
        return None

    @property
    def card_display_name(self) -> Optional[str]:
        """Get display name for card."""
        if self.card_brand and self.card_last_four:
            return f"{self.card_brand.title()} ending in {self.card_last_four}"
        return None

    def update_from_stripe_payment_intent(self, payment_intent: dict) -> None:
        """Update payment from Stripe PaymentIntent object."""
        self.stripe_payment_intent_id = payment_intent.get("id")
        self.amount = Decimal(str(payment_intent.get("amount", 0) / 100))  # Convert from cents
        self.currency = payment_intent.get("currency", "usd").upper()
        self.status = PaymentStatus(payment_intent.get("status", "pending"))
        
        # Update gateway response
        self.gateway_response = payment_intent
        
        # Extract payment method details if available
        if payment_intent.get("payment_method"):
            pm = payment_intent["payment_method"]
            self.stripe_payment_method_id = pm.get("id")
            
            if pm.get("card"):
                card = pm["card"]
                self.card_last_four = card.get("last4")
                self.card_brand = card.get("brand")
                self.card_exp_month = card.get("exp_month")
                self.card_exp_year = card.get("exp_year")
                self.payment_method = PaymentMethod.CARD
        
        # Update timestamps based on status
        now = datetime.utcnow()
        if self.status == PaymentStatus.SUCCEEDED and not self.processed_at:
            self.processed_at = now
        elif self.status == PaymentStatus.FAILED and not self.failed_at:
            self.failed_at = now

    def update_from_stripe_charge(self, charge: dict) -> None:
        """Update payment from Stripe Charge object."""
        self.stripe_charge_id = charge.get("id")
        
        # Update failure information if applicable
        if charge.get("failure_code"):
            self.failure_code = charge["failure_code"]
        if charge.get("failure_message"):
            self.failure_reason = charge["failure_message"]
        
        # Update risk assessment
        if charge.get("outcome"):
            outcome = charge["outcome"]
            if outcome.get("risk_score"):
                self.risk_score = outcome["risk_score"]
            if outcome.get("risk_level"):
                self.risk_level = outcome["risk_level"]

    def can_be_refunded(self) -> bool:
        """Check if payment can be refunded."""
        return self.status == PaymentStatus.SUCCEEDED

    def mark_as_succeeded(self, stripe_charge_id: Optional[str] = None) -> None:
        """Mark payment as succeeded."""
        self.status = PaymentStatus.SUCCEEDED
        self.processed_at = datetime.utcnow()
        if stripe_charge_id:
            self.stripe_charge_id = stripe_charge_id

    def mark_as_failed(self, failure_reason: Optional[str] = None, failure_code: Optional[str] = None) -> None:
        """Mark payment as failed."""
        self.status = PaymentStatus.FAILED
        self.failed_at = datetime.utcnow()
        if failure_reason:
            self.failure_reason = failure_reason
        if failure_code:
            self.failure_code = failure_code

    def create_refund(self, amount: Optional[Decimal] = None, reason: Optional[str] = None) -> "Refund":
        """Create a refund for this payment."""
        refund_amount = amount or self.amount
        
        # Import here to avoid circular imports
        from .refund import Refund, RefundReason
        
        refund = Refund(
            payment_id=self.id,
            order_id=self.order_id,
            amount=refund_amount,
            currency=self.currency,
            reason=RefundReason.REQUESTED_BY_CUSTOMER if not reason else RefundReason(reason),
            stripe_payment_intent_id=self.stripe_payment_intent_id,
            stripe_charge_id=self.stripe_charge_id
        )
        
        return refund