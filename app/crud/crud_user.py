from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from fastapi import Request, HTTPException

from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserPasswordChange
from app.core.security import get_password_hash, verify_password
from app.services.audit_service import AuditService


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get user by email address."""
        result = await db.execute(
            select(User).where(
                and_(
                    User.email == email,
                    User.deleted_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_active_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get active user by email address."""
        result = await db.execute(
            select(User).where(
                and_(
                    User.email == email,
                    User.is_active == True,
                    User.deleted_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self, 
        db: AsyncSession, 
        *, 
        obj_in: UserCreate,
        request: Optional[Request] = None
    ) -> User:
        """Create a new user with audit logging."""
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            phone_number=obj_in.phone_number,
            is_active=True,
            email_verified=False
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log the registration
        user_data = AuditService.extract_model_values(db_obj)
        await AuditService.log_user_registration(
            db=db,
            user_id=db_obj.id,
            user_data=user_data,
            request=request
        )
        
        return db_obj

    async def update_profile(
        self,
        db: AsyncSession,
        *,
        db_obj: User,
        obj_in: UserUpdate,
        request: Optional[Request] = None
    ) -> User:
        """Update user profile with audit logging."""
        # Store old values for audit
        old_user_copy = User(
            id=db_obj.id,
            email=db_obj.email,
            first_name=db_obj.first_name,
            last_name=db_obj.last_name,
            phone_number=db_obj.phone_number,
            is_active=db_obj.is_active,
            email_verified=db_obj.email_verified,
            is_superuser=db_obj.is_superuser,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at,
            deleted_at=db_obj.deleted_at
        )
        
        # Update fields
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log the profile update
        await AuditService.log_user_profile_update(
            db=db,
            user_id=db_obj.id,
            old_user=old_user_copy,
            updated_values=update_data,
            request=request
        )
        
        return db_obj

    async def change_password(
        self,
        db: AsyncSession,
        *,
        user: User,
        password_data: UserPasswordChange,
        request: Optional[Request] = None
    ) -> User:
        """Change user password with validation and audit logging."""
        # Verify current password
        if not verify_password(password_data.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        user.hashed_password = get_password_hash(password_data.new_password)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log the password change
        await AuditService.log_password_change(
            db=db,
            user_id=user.id,
            request=request
        )
        
        return user

    async def soft_delete(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        deleted_by_user_id: str,
        request: Optional[Request] = None
    ) -> Optional[User]:
        """Soft delete a user with audit logging."""
        user = await self.get(db, id=user_id)
        if not user or user.deleted_at:
            return None
        
        user.deleted_at = datetime.utcnow()
        user.is_active = False
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log the deletion
        await AuditService.log_user_deletion(
            db=db,
            user_id=user_id,
            deleted_by_user_id=deleted_by_user_id,
            request=request
        )
        
        return user

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password."""
        user = await self.get_active_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def is_active(self, user: User) -> bool:
        """Check if user is active and not deleted."""
        return user.is_active and not user.deleted_at

    async def is_superuser(self, user: User) -> bool:
        """Check if user is a superuser."""
        return user.is_superuser

    async def verify_email(
        self,
        db: AsyncSession,
        *,
        user: User,
        request: Optional[Request] = None
    ) -> User:
        """Mark user email as verified with audit logging."""
        old_verified = user.email_verified
        user.email_verified = True
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log the email verification
        await AuditService.log_change(
            db=db,
            user_id=user.id,
            action="verify_email",
            resource_type="user",
            resource_id=user.id,
            old_values={"email_verified": old_verified},
            new_values={"email_verified": True},
            request=request
        )
        
        return user

    async def activate_user(
        self,
        db: AsyncSession,
        *,
        user: User,
        activated_by_user_id: str,
        request: Optional[Request] = None
    ) -> User:
        """Activate a user account with audit logging."""
        old_active = user.is_active
        user.is_active = True
        user.deleted_at = None  # Clear soft delete if present
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log the activation
        await AuditService.log_change(
            db=db,
            user_id=activated_by_user_id,
            action="activate",
            resource_type="user",
            resource_id=user.id,
            old_values={"is_active": old_active, "deleted_at": user.deleted_at},
            new_values={"is_active": True, "deleted_at": None},
            request=request
        )
        
        return user

    async def deactivate_user(
        self,
        db: AsyncSession,
        *,
        user: User,
        deactivated_by_user_id: str,
        request: Optional[Request] = None
    ) -> User:
        """Deactivate a user account with audit logging."""
        old_active = user.is_active
        user.is_active = False
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log the deactivation
        await AuditService.log_change(
            db=db,
            user_id=deactivated_by_user_id,
            action="deactivate",
            resource_type="user",
            resource_id=user.id,
            old_values={"is_active": old_active},
            new_values={"is_active": False},
            request=request
        )
        
        return user


user = CRUDUser(User)