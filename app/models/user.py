from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import Boolean, String, DateTime, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_email_deleted", "email", "deleted_at"),
        Index("idx_users_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True
    )
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    addresses: Mapped[list["Address"]] = relationship(
        "Address", back_populates="user", cascade="all, delete-orphan"
    )
    carts: Mapped[list["Cart"]] = relationship(
        "Cart", back_populates="user", cascade="all, delete-orphan"
    )
    orders = relationship("Order", back_populates="user")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"