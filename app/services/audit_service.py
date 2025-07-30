from typing import Optional, Dict, Any, Union
from datetime import datetime
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect
from pydantic import BaseModel

from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.database import Base


class AuditService:
    """Service for handling audit logging of user and system changes."""

    @staticmethod
    async def log_change(
        db: AsyncSession,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a change to the audit trail."""
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(audit_log)
        
        return audit_log

    @staticmethod
    def extract_model_values(model_instance: Base, exclude_fields: Optional[set] = None) -> Dict[str, Any]:
        """Extract values from a SQLAlchemy model instance for audit logging."""
        if exclude_fields is None:
            exclude_fields = {'hashed_password', 'created_at', 'updated_at'}
        
        values = {}
        mapper = inspect(model_instance.__class__)
        
        for column in mapper.columns:
            if column.name not in exclude_fields:
                value = getattr(model_instance, column.name)
                # Convert datetime objects to ISO format for JSON serialization
                if isinstance(value, datetime):
                    value = value.isoformat()
                values[column.name] = value
        
        return values

    @staticmethod
    def extract_schema_values(schema_instance: BaseModel, exclude_fields: Optional[set] = None) -> Dict[str, Any]:
        """Extract values from a Pydantic schema instance for audit logging."""
        if exclude_fields is None:
            exclude_fields = {'password', 'current_password', 'new_password', 'confirm_password'}
        
        values = schema_instance.model_dump(exclude=exclude_fields, exclude_unset=True)
        
        # Convert datetime objects to ISO format for JSON serialization
        for key, value in values.items():
            if isinstance(value, datetime):
                values[key] = value.isoformat()
        
        return values

    @staticmethod
    async def log_user_profile_update(
        db: AsyncSession,
        user_id: str,
        old_user: User,
        updated_values: Dict[str, Any],
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a user profile update."""
        old_values = AuditService.extract_model_values(old_user)
        
        # Only include the fields that were actually updated
        new_values = {k: v for k, v in updated_values.items() if k in old_values}
        
        return await AuditService.log_change(
            db=db,
            user_id=user_id,
            action="update_profile",
            resource_type="user",
            resource_id=user_id,
            old_values=old_values,
            new_values=new_values,
            request=request
        )

    @staticmethod
    async def log_password_change(
        db: AsyncSession,
        user_id: str,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a password change (without storing the actual passwords)."""
        return await AuditService.log_change(
            db=db,
            user_id=user_id,
            action="change_password",
            resource_type="user",
            resource_id=user_id,
            old_values={"action": "password_changed"},
            new_values={"timestamp": datetime.utcnow().isoformat()},
            request=request
        )

    @staticmethod
    async def log_address_action(
        db: AsyncSession,
        user_id: str,
        action: str,  # create, update, delete, set_default
        address_id: str,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log an address-related action."""
        return await AuditService.log_change(
            db=db,
            user_id=user_id,
            action=f"address_{action}",
            resource_type="address",
            resource_id=address_id,
            old_values=old_values,
            new_values=new_values,
            request=request
        )

    @staticmethod
    async def log_user_registration(
        db: AsyncSession,
        user_id: str,
        user_data: Dict[str, Any],
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a new user registration."""
        # Remove sensitive data
        safe_user_data = {k: v for k, v in user_data.items() if k not in {'password', 'hashed_password'}}
        
        return await AuditService.log_change(
            db=db,
            user_id=user_id,
            action="register",
            resource_type="user",
            resource_id=user_id,
            old_values=None,
            new_values=safe_user_data,
            request=request
        )

    @staticmethod
    async def log_user_deletion(
        db: AsyncSession,
        user_id: str,
        deleted_by_user_id: str,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a user soft deletion."""
        return await AuditService.log_change(
            db=db,
            user_id=deleted_by_user_id,
            action="soft_delete",
            resource_type="user",
            resource_id=user_id,
            old_values={"status": "active"},
            new_values={"status": "deleted", "deleted_at": datetime.utcnow().isoformat()},
            request=request
        )