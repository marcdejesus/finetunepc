from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Integer, Text, CheckConstraint, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class StockMovementType(str, Enum):
    """Stock movement type enumeration."""
    INITIAL_STOCK = "initial_stock"       # Initial inventory setup
    PURCHASE = "purchase"                 # Stock received from supplier
    SALE = "sale"                        # Stock sold to customer
    RETURN = "return"                    # Customer return
    ADJUSTMENT = "adjustment"            # Manual stock adjustment
    DAMAGED = "damaged"                  # Damaged goods write-off
    EXPIRED = "expired"                  # Expired goods write-off
    TRANSFER = "transfer"                # Transfer between warehouses
    RESERVATION = "reservation"          # Stock reserved for order
    RELEASE = "release"                  # Reserved stock released


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        Index("idx_inventory_variant_id", "variant_id"),
        Index("idx_inventory_warehouse_location", "warehouse_location"),
        Index("idx_inventory_reorder_point", "reorder_point"),
        Index("idx_inventory_updated_at", "updated_at"),
        CheckConstraint("quantity_on_hand >= 0", name="ck_inventory_quantity_positive"),
        CheckConstraint("reserved_quantity >= 0", name="ck_inventory_reserved_positive"),
        CheckConstraint("reorder_point >= 0", name="ck_inventory_reorder_positive"),
        CheckConstraint("max_stock_level >= reorder_point", name="ck_inventory_max_ge_reorder"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    variant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("product_variants.id"), nullable=False, unique=True
    )
    
    # Stock levels
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Stock management settings
    reorder_point: Mapped[int] = mapped_column(Integer, default=0)
    max_stock_level: Mapped[Optional[int]] = mapped_column(Integer)
    reorder_quantity: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Location and tracking
    warehouse_location: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    bin_location: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Stock status
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_backorder: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Auto-reorder settings
    auto_reorder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    supplier_id: Mapped[Optional[str]] = mapped_column(String(255))  # External supplier reference
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Timestamps
    last_counted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_movement_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="inventory")
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement", back_populates="inventory", cascade="all, delete-orphan"
    )
    reservations: Mapped[list["StockReservation"]] = relationship(
        "StockReservation", back_populates="inventory", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Inventory(variant_id={self.variant_id}, on_hand={self.quantity_on_hand}, available={self.available_quantity})>"

    @property
    def available_quantity(self) -> int:
        """Calculate available quantity (on hand minus reserved)."""
        return max(0, self.quantity_on_hand - self.reserved_quantity)

    @property
    def is_low_stock(self) -> bool:
        """Check if inventory is below reorder point."""
        return self.available_quantity <= self.reorder_point

    @property
    def is_out_of_stock(self) -> bool:
        """Check if inventory is out of stock."""
        return self.available_quantity <= 0

    @property
    def needs_reorder(self) -> bool:
        """Check if inventory needs to be reordered."""
        return self.is_low_stock and self.auto_reorder_enabled

    @property
    def stock_level_percentage(self) -> Optional[float]:
        """Get current stock level as percentage of max stock level."""
        if self.max_stock_level and self.max_stock_level > 0:
            return (self.quantity_on_hand / self.max_stock_level) * 100
        return None

    def can_fulfill_quantity(self, quantity: int) -> bool:
        """Check if the requested quantity can be fulfilled."""
        if not self.track_inventory:
            return True
        if self.allow_backorder:
            return True
        return self.available_quantity >= quantity

    def reserve_stock(self, quantity: int, order_id: Optional[str] = None, expires_at: Optional[datetime] = None) -> bool:
        """Reserve stock for an order."""
        if not self.can_fulfill_quantity(quantity):
            return False
        
        if expires_at is None:
            expires_at = datetime.utcnow() + timedelta(hours=24)  # Default 24-hour reservation
        
        self.reserved_quantity += quantity
        
        # Create reservation record
        reservation = StockReservation(
            inventory_id=self.id,
            quantity=quantity,
            order_id=order_id,
            expires_at=expires_at
        )
        self.reservations.append(reservation)
        
        return True

    def release_reservation(self, quantity: int, order_id: Optional[str] = None) -> bool:
        """Release reserved stock."""
        if self.reserved_quantity < quantity:
            return False
        
        self.reserved_quantity -= quantity
        
        # Find and update/remove reservation record
        if order_id:
            for reservation in self.reservations:
                if reservation.order_id == order_id and reservation.is_active:
                    if reservation.quantity <= quantity:
                        reservation.release()
                        quantity -= reservation.quantity
                    else:
                        reservation.quantity -= quantity
                        quantity = 0
                    
                    if quantity <= 0:
                        break
        
        return True

    def adjust_stock(self, new_quantity: int, movement_type: StockMovementType = StockMovementType.ADJUSTMENT, 
                    reference: Optional[str] = None, notes: Optional[str] = None) -> "StockMovement":
        """Adjust stock quantity and record the movement."""
        old_quantity = self.quantity_on_hand
        difference = new_quantity - old_quantity
        
        self.quantity_on_hand = new_quantity
        self.last_movement_at = datetime.utcnow()
        
        # Create stock movement record
        movement = StockMovement(
            inventory_id=self.id,
            movement_type=movement_type,
            quantity_change=difference,
            quantity_after=new_quantity,
            reference=reference,
            notes=notes
        )
        self.stock_movements.append(movement)
        
        return movement

    def add_stock(self, quantity: int, movement_type: StockMovementType = StockMovementType.PURCHASE,
                 reference: Optional[str] = None, notes: Optional[str] = None) -> "StockMovement":
        """Add stock and record the movement."""
        return self.adjust_stock(
            self.quantity_on_hand + quantity, 
            movement_type, 
            reference, 
            notes
        )

    def remove_stock(self, quantity: int, movement_type: StockMovementType = StockMovementType.SALE,
                    reference: Optional[str] = None, notes: Optional[str] = None) -> Optional["StockMovement"]:
        """Remove stock and record the movement."""
        if self.quantity_on_hand < quantity:
            return None
        
        return self.adjust_stock(
            self.quantity_on_hand - quantity,
            movement_type,
            reference,
            notes
        )

    def cleanup_expired_reservations(self) -> int:
        """Clean up expired reservations and return count of cleaned items."""
        now = datetime.utcnow()
        expired_count = 0
        
        for reservation in self.reservations:
            if reservation.is_expired and reservation.is_active:
                self.reserved_quantity -= reservation.quantity
                reservation.expire()
                expired_count += 1
        
        return expired_count


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("idx_stock_movements_inventory_id", "inventory_id"),
        Index("idx_stock_movements_type", "movement_type"),
        Index("idx_stock_movements_created_at", "created_at"),
        Index("idx_stock_movements_reference", "reference"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    inventory_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("inventory.id"), nullable=False
    )
    
    # Movement details
    movement_type: Mapped[StockMovementType] = mapped_column(
        SQLEnum(StockMovementType), nullable=False
    )
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_after: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Reference information
    reference: Mapped[Optional[str]] = mapped_column(String(255))  # Order ID, PO number, etc.
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # User tracking
    created_by: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="stock_movements")

    def __repr__(self) -> str:
        return f"<StockMovement(type={self.movement_type}, change={self.quantity_change}, after={self.quantity_after})>"


class StockReservation(Base):
    __tablename__ = "stock_reservations"
    __table_args__ = (
        Index("idx_stock_reservations_inventory_id", "inventory_id"),
        Index("idx_stock_reservations_order_id", "order_id"),
        Index("idx_stock_reservations_expires_at", "expires_at"),
        Index("idx_stock_reservations_is_active", "is_active"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    inventory_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("inventory.id"), nullable=False
    )
    
    # Reservation details
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    order_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timing
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    released_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    inventory: Mapped["Inventory"] = relationship("Inventory", back_populates="reservations")

    def __repr__(self) -> str:
        return f"<StockReservation(quantity={self.quantity}, order_id={self.order_id}, active={self.is_active})>"

    @property
    def is_expired(self) -> bool:
        """Check if the reservation has expired."""
        return datetime.utcnow() > self.expires_at

    def extend_expiration(self, hours: int = 24) -> None:
        """Extend the reservation expiration time."""
        self.expires_at = datetime.utcnow() + timedelta(hours=hours)

    def release(self) -> None:
        """Release the reservation."""
        self.is_active = False
        self.released_at = datetime.utcnow()

    def expire(self) -> None:
        """Mark the reservation as expired."""
        self.is_active = False
        self.released_at = datetime.utcnow()