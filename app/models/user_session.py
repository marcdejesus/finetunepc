from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("idx_user_sessions_user_id", "user_id"),
        Index("idx_user_sessions_access_token", "access_token_hash"),
        Index("idx_user_sessions_refresh_token", "refresh_token_hash"),
        Index("idx_user_sessions_expires_at", "access_token_expires_at"),
        Index("idx_user_sessions_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False
    )
    
    # Token storage - store hashed versions for security
    access_token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    
    # Token expiration tracking
    access_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    refresh_token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Session metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # IPv6 compatible
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Session status
    is_active: Mapped[bool] = mapped_column(default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, user_id={self.user_id}, active={self.is_active})>"

    def is_access_token_expired(self) -> bool:
        """Check if the access token has expired."""
        return datetime.utcnow() > self.access_token_expires_at

    def is_refresh_token_expired(self) -> bool:
        """Check if the refresh token has expired."""
        return datetime.utcnow() > self.refresh_token_expires_at