from datetime import datetime
from typing import Optional
from uuid import uuid4
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AddressType(str, Enum):
    """Address type enumeration."""
    BILLING = "billing"
    SHIPPING = "shipping"
    BOTH = "both"


class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = (
        Index("idx_addresses_user_id", "user_id"),
        Index("idx_addresses_type", "address_type"),
        Index("idx_addresses_default", "is_default", "address_type"),
        Index("idx_addresses_user_type", "user_id", "address_type"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False
    )
    
    # Address type
    address_type: Mapped[AddressType] = mapped_column(
        SQLEnum(AddressType), nullable=False, default=AddressType.BOTH
    )
    
    # Address fields
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(200))
    address_line_1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line_2: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state_province: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)  # ISO 3166-1 alpha-2
    
    # Contact information
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Address metadata
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Geolocation (optional)
    latitude: Mapped[Optional[str]] = mapped_column(String(20))
    longitude: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="addresses")

    def __repr__(self) -> str:
        return f"<Address(id={self.id}, type={self.address_type}, city={self.city})>"

    @property
    def full_name(self) -> str:
        """Return the full name for this address."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def full_address(self) -> str:
        """Return the formatted full address."""
        lines = [self.address_line_1]
        if self.address_line_2:
            lines.append(self.address_line_2)
        lines.append(f"{self.city}, {self.state_province} {self.postal_code}")
        lines.append(self.country)
        return "\n".join(lines)

    def can_be_used_for(self, address_type: AddressType) -> bool:
        """Check if this address can be used for the specified type."""
        return (
            self.address_type == AddressType.BOTH or 
            self.address_type == address_type
        )