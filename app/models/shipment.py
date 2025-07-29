from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Integer, DECIMAL, Text, CheckConstraint, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.core.database import Base


class ShipmentStatus(str, Enum):
    """Shipment status enumeration."""
    PENDING = "pending"                # Shipment created but not shipped
    PROCESSING = "processing"          # Being prepared for shipment
    SHIPPED = "shipped"                # Package shipped
    IN_TRANSIT = "in_transit"          # Package in transit
    OUT_FOR_DELIVERY = "out_for_delivery"    # Out for delivery
    DELIVERED = "delivered"            # Package delivered
    FAILED_DELIVERY = "failed_delivery"      # Delivery failed
    RETURNED = "returned"              # Package returned
    LOST = "lost"                      # Package lost
    CANCELLED = "cancelled"            # Shipment cancelled


class ShippingCarrier(str, Enum):
    """Shipping carrier enumeration."""
    UPS = "ups"
    FEDEX = "fedex"
    USPS = "usps"
    DHL = "dhl"
    AMAZON = "amazon"
    LOCAL_COURIER = "local_courier"
    OTHER = "other"


class Shipment(Base):
    __tablename__ = "shipments"
    __table_args__ = (
        Index("idx_shipments_order_id", "order_id"),
        Index("idx_shipments_tracking_number", "tracking_number"),
        Index("idx_shipments_carrier", "carrier"),
        Index("idx_shipments_status", "status"),
        Index("idx_shipments_shipped_at", "shipped_at"),
        Index("idx_shipments_delivered_at", "delivered_at"),
        CheckConstraint("total_weight >= 0", name="ck_shipment_weight_positive"),
        CheckConstraint("shipping_cost >= 0", name="ck_shipment_cost_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    order_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("orders.id"), nullable=False
    )
    
    # Shipment identification
    tracking_number: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True
    )
    carrier: Mapped[ShippingCarrier] = mapped_column(
        SQLEnum(ShippingCarrier), nullable=False
    )
    service_type: Mapped[Optional[str]] = mapped_column(String(100))  # Ground, Express, etc.
    
    # Shipment status
    status: Mapped[ShipmentStatus] = mapped_column(
        SQLEnum(ShipmentStatus), default=ShipmentStatus.PENDING
    )
    
    # Shipping address (denormalized from order for historical record)
    recipient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    recipient_company: Mapped[Optional[str]] = mapped_column(String(200))
    address_line_1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line_2: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state_province: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Package details
    total_weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))  # in kg
    package_dimensions: Mapped[Optional[str]] = mapped_column(String(100))  # LxWxH
    number_of_packages: Mapped[int] = mapped_column(Integer, default=1)
    
    # Shipping costs
    shipping_cost: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    insurance_cost: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    
    # Carrier integration
    carrier_service_id: Mapped[Optional[str]] = mapped_column(String(100))
    carrier_rate_id: Mapped[Optional[str]] = mapped_column(String(100))
    carrier_shipment_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Labels and documentation
    shipping_label_url: Mapped[Optional[str]] = mapped_column(String(500))
    commercial_invoice_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Delivery information
    estimated_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delivery_signature: Mapped[Optional[str]] = mapped_column(String(255))
    delivery_instructions: Mapped[Optional[str]] = mapped_column(Text)
    
    # Tracking data
    last_tracking_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    tracking_events: Mapped[Optional[list]] = mapped_column(JSON)  # Array of tracking events
    
    # Shipment metadata
    notes: Mapped[Optional[str]] = mapped_column(Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Insurance and declared value
    is_insured: Mapped[bool] = mapped_column(Boolean, default=False)
    declared_value: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2))
    
    # Special handling
    requires_signature: Mapped[bool] = mapped_column(Boolean, default=False)
    is_fragile: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hazardous: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    shipped_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="shipments")
    shipment_items: Mapped[list["ShipmentItem"]] = relationship(
        "ShipmentItem", back_populates="shipment", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Shipment(id={self.id}, tracking={self.tracking_number}, status={self.status})>"

    @property
    def is_shipped(self) -> bool:
        """Check if shipment has been shipped."""
        return self.status not in [ShipmentStatus.PENDING, ShipmentStatus.PROCESSING]

    @property
    def is_delivered(self) -> bool:
        """Check if shipment has been delivered."""
        return self.status == ShipmentStatus.DELIVERED

    @property
    def is_in_transit(self) -> bool:
        """Check if shipment is in transit."""
        return self.status in [
            ShipmentStatus.SHIPPED,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY
        ]

    @property
    def full_address(self) -> str:
        """Get formatted full address."""
        lines = []
        if self.recipient_company:
            lines.append(self.recipient_company)
        lines.append(self.recipient_name)
        lines.append(self.address_line_1)
        if self.address_line_2:
            lines.append(self.address_line_2)
        lines.append(f"{self.city}, {self.state_province} {self.postal_code}")
        lines.append(self.country)
        return "\n".join(lines)

    @property
    def total_cost(self) -> Decimal:
        """Calculate total shipping cost including insurance."""
        cost = self.shipping_cost or Decimal("0.00")
        if self.insurance_cost:
            cost += self.insurance_cost
        return cost

    @property
    def latest_tracking_event(self) -> Optional[dict]:
        """Get the latest tracking event."""
        if self.tracking_events and len(self.tracking_events) > 0:
            return self.tracking_events[-1]
        return None

    def can_transition_to(self, new_status: ShipmentStatus) -> bool:
        """Check if shipment can transition to new status."""
        valid_transitions = {
            ShipmentStatus.PENDING: [ShipmentStatus.PROCESSING, ShipmentStatus.CANCELLED],
            ShipmentStatus.PROCESSING: [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
            ShipmentStatus.SHIPPED: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.LOST],
            ShipmentStatus.IN_TRANSIT: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.LOST],
            ShipmentStatus.OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY],
            ShipmentStatus.DELIVERED: [],
            ShipmentStatus.FAILED_DELIVERY: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED, ShipmentStatus.IN_TRANSIT],
            ShipmentStatus.RETURNED: [],
            ShipmentStatus.LOST: [],
            ShipmentStatus.CANCELLED: []
        }
        
        return new_status in valid_transitions.get(self.status, [])

    def transition_to(self, new_status: ShipmentStatus, notes: Optional[str] = None) -> bool:
        """Transition shipment to new status if valid."""
        if not self.can_transition_to(new_status):
            return False
        
        old_status = self.status
        self.status = new_status
        
        # Handle status-specific logic
        now = datetime.utcnow()
        if new_status == ShipmentStatus.SHIPPED and not self.shipped_at:
            self.shipped_at = now
        elif new_status == ShipmentStatus.DELIVERED and not self.delivered_at:
            self.delivered_at = now
        
        # Add tracking event
        self.add_tracking_event(
            status=new_status.value,
            description=f"Status changed from {old_status.value} to {new_status.value}",
            location="System",
            timestamp=now
        )
        
        if notes:
            self.add_internal_note(f"Status transition: {old_status.value} -> {new_status.value}: {notes}")
        
        return True

    def add_tracking_event(self, status: str, description: str, location: Optional[str] = None, 
                          timestamp: Optional[datetime] = None) -> None:
        """Add a tracking event."""
        event = {
            "status": status,
            "description": description,
            "location": location,
            "timestamp": (timestamp or datetime.utcnow()).isoformat()
        }
        
        if self.tracking_events is None:
            self.tracking_events = []
        
        self.tracking_events.append(event)
        self.last_tracking_update = timestamp or datetime.utcnow()

    def add_internal_note(self, note: str, user_id: Optional[str] = None) -> None:
        """Add an internal note to the shipment."""
        timestamp = datetime.utcnow()
        user_info = f" by {user_id}" if user_id else ""
        note_entry = f"{timestamp}{user_info}: {note}"
        
        if self.internal_notes:
            self.internal_notes += f"\n{note_entry}"
        else:
            self.internal_notes = note_entry

    def update_from_address(self, address: "Address") -> None:
        """Update shipping address from Address model."""
        self.recipient_name = f"{address.first_name} {address.last_name}".strip()
        self.recipient_company = address.company
        self.address_line_1 = address.address_line_1
        self.address_line_2 = address.address_line_2
        self.city = address.city
        self.state_province = address.state_province
        self.postal_code = address.postal_code
        self.country = address.country
        self.phone_number = address.phone_number

    def generate_tracking_url(self) -> Optional[str]:
        """Generate tracking URL based on carrier and tracking number."""
        if not self.tracking_number:
            return None
        
        tracking_urls = {
            ShippingCarrier.UPS: f"https://www.ups.com/track?loc=en_US&tracknum={self.tracking_number}",
            ShippingCarrier.FEDEX: f"https://www.fedex.com/fedextrack/?tracknumbers={self.tracking_number}",
            ShippingCarrier.USPS: f"https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={self.tracking_number}",
            ShippingCarrier.DHL: f"https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id={self.tracking_number}",
        }
        
        return tracking_urls.get(self.carrier)

    def calculate_weight(self) -> Decimal:
        """Calculate total weight from shipment items."""
        return sum(item.weight * item.quantity for item in self.shipment_items if item.weight)


class ShipmentItem(Base):
    __tablename__ = "shipment_items"
    __table_args__ = (
        Index("idx_shipment_items_shipment_id", "shipment_id"),
        Index("idx_shipment_items_order_item_id", "order_item_id"),
        CheckConstraint("quantity > 0", name="ck_shipment_item_quantity_positive"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    shipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("shipments.id"), nullable=False
    )
    order_item_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("order_items.id"), nullable=False
    )
    
    # Item details
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 3))
    
    # Product snapshot (at time of shipment)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    variant_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    variant_title: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="shipment_items")
    order_item: Mapped["OrderItem"] = relationship("OrderItem")

    def __repr__(self) -> str:
        return f"<ShipmentItem(product={self.product_name}, qty={self.quantity})>"

    def update_from_order_item(self, order_item: "OrderItem") -> None:
        """Update shipment item from order item."""
        self.product_name = order_item.product_name
        self.variant_sku = order_item.variant_sku
        self.variant_title = order_item.variant_title
        self.weight = order_item.weight