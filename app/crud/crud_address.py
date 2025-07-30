from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, update
from sqlalchemy.orm import selectinload
from fastapi import Request

from app.crud.base import CRUDBase
from app.models.address import Address, AddressType
from app.models.user import User
from app.schemas.user import AddressCreate, AddressUpdate
from app.services.audit_service import AuditService


class CRUDAddress(CRUDBase[Address, AddressCreate, AddressUpdate]):
    async def get_by_user(
        self, 
        db: AsyncSession, 
        *, 
        user_id: str,
        address_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Address]:
        """Get addresses for a specific user with optional filtering by type."""
        query = select(Address).where(Address.user_id == user_id)
        
        if address_type:
            # Convert string to enum and handle 'both' type
            addr_type = AddressType(address_type.lower())
            if addr_type == AddressType.BOTH:
                query = query.where(Address.address_type == addr_type)
            else:
                query = query.where(
                    or_(
                        Address.address_type == addr_type,
                        Address.address_type == AddressType.BOTH
                    )
                )
        
        query = query.offset(skip).limit(limit).order_by(Address.is_default.desc(), Address.created_at)
        result = await db.execute(query)
        return result.scalars().all()

    async def count_by_user(
        self, 
        db: AsyncSession, 
        *, 
        user_id: str,
        address_type: Optional[str] = None
    ) -> int:
        """Count addresses for a specific user with optional filtering by type."""
        query = select(func.count(Address.id)).where(Address.user_id == user_id)
        
        if address_type:
            addr_type = AddressType(address_type.lower())
            if addr_type == AddressType.BOTH:
                query = query.where(Address.address_type == addr_type)
            else:
                query = query.where(
                    or_(
                        Address.address_type == addr_type,
                        Address.address_type == AddressType.BOTH
                    )
                )
        
        result = await db.execute(query)
        return result.scalar_one()

    async def get_user_address(
        self, 
        db: AsyncSession, 
        *, 
        address_id: str, 
        user_id: str
    ) -> Optional[Address]:
        """Get a specific address that belongs to a user."""
        result = await db.execute(
            select(Address).where(
                and_(
                    Address.id == address_id,
                    Address.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_for_user(
        self, 
        db: AsyncSession, 
        *, 
        obj_in: AddressCreate, 
        user_id: str,
        request: Optional[Request] = None
    ) -> Address:
        """Create a new address for a user."""
        # Convert address_type string to enum
        address_type = AddressType(obj_in.address_type.lower())
        
        # Create the address
        db_obj = Address(
            user_id=user_id,
            address_type=address_type,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            company=obj_in.company,
            address_line_1=obj_in.address_line_1,
            address_line_2=obj_in.address_line_2,
            city=obj_in.city,
            state_province=obj_in.state_province,
            postal_code=obj_in.postal_code,
            country=obj_in.country.upper(),
            phone_number=obj_in.phone_number,
            is_default=False  # Will be set via separate method if needed
        )
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log the creation
        new_values = AuditService.extract_model_values(db_obj)
        await AuditService.log_address_action(
            db=db,
            user_id=user_id,
            action="create",
            address_id=db_obj.id,
            old_values=None,
            new_values=new_values,
            request=request
        )
        
        return db_obj

    async def update_user_address(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: Address, 
        obj_in: AddressUpdate,
        request: Optional[Request] = None
    ) -> Address:
        """Update an address belonging to a user."""
        # Store old values for audit
        old_values = AuditService.extract_model_values(db_obj)
        
        # Update fields
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Handle address_type conversion
        if 'address_type' in update_data and update_data['address_type']:
            update_data['address_type'] = AddressType(update_data['address_type'].lower())
        
        # Handle country code normalization
        if 'country' in update_data and update_data['country']:
            update_data['country'] = update_data['country'].upper()
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log the update
        new_values = AuditService.extract_model_values(db_obj)
        await AuditService.log_address_action(
            db=db,
            user_id=db_obj.user_id,
            action="update",
            address_id=db_obj.id,
            old_values=old_values,
            new_values=new_values,
            request=request
        )
        
        return db_obj

    async def delete_user_address(
        self, 
        db: AsyncSession, 
        *, 
        address_id: str, 
        user_id: str,
        request: Optional[Request] = None
    ) -> Optional[Address]:
        """Delete an address belonging to a user."""
        # Get the address first
        address = await self.get_user_address(db, address_id=address_id, user_id=user_id)
        if not address:
            return None
        
        # Store old values for audit
        old_values = AuditService.extract_model_values(address)
        
        # Delete the address
        await db.delete(address)
        await db.commit()
        
        # Log the deletion
        await AuditService.log_address_action(
            db=db,
            user_id=user_id,
            action="delete",
            address_id=address_id,
            old_values=old_values,
            new_values={"status": "deleted"},
            request=request
        )
        
        return address

    async def set_default_address(
        self, 
        db: AsyncSession, 
        *, 
        address_id: str, 
        user_id: str,
        address_type: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Optional[Address]:
        """Set an address as the default for a user."""
        # Get the address to set as default
        address = await self.get_user_address(db, address_id=address_id, user_id=user_id)
        if not address:
            return None
        
        # Determine which address type to set as default
        target_type = address.address_type
        if address_type:
            target_type = AddressType(address_type.lower())
            # Verify the address can be used for this type
            if not address.can_be_used_for(target_type):
                raise ValueError(f"Address cannot be used for {address_type} purposes")
        
        # Unset any existing default addresses of the same type for this user
        if target_type == AddressType.BOTH:
            # If setting as default for both, unset all defaults
            await db.execute(
                update(Address)
                .where(Address.user_id == user_id)
                .values(is_default=False)
            )
        else:
            # Unset defaults for this specific type or 'both' type
            await db.execute(
                update(Address)
                .where(
                    and_(
                        Address.user_id == user_id,
                        or_(
                            Address.address_type == target_type,
                            Address.address_type == AddressType.BOTH
                        )
                    )
                )
                .values(is_default=False)
            )
        
        # Set this address as default
        address.is_default = True
        db.add(address)
        await db.commit()
        await db.refresh(address)
        
        # Log the change
        await AuditService.log_address_action(
            db=db,
            user_id=user_id,
            action="set_default",
            address_id=address_id,
            old_values={"is_default": False},
            new_values={"is_default": True, "address_type": target_type.value},
            request=request
        )
        
        return address

    async def get_default_address(
        self, 
        db: AsyncSession, 
        *, 
        user_id: str, 
        address_type: str
    ) -> Optional[Address]:
        """Get the default address for a user and address type."""
        addr_type = AddressType(address_type.lower())
        
        result = await db.execute(
            select(Address).where(
                and_(
                    Address.user_id == user_id,
                    Address.is_default == True,
                    or_(
                        Address.address_type == addr_type,
                        Address.address_type == AddressType.BOTH
                    )
                )
            )
        )
        return result.scalar_one_or_none()

    async def verify_address(
        self, 
        db: AsyncSession, 
        *, 
        address_id: str, 
        user_id: str,
        request: Optional[Request] = None
    ) -> Optional[Address]:
        """Mark an address as verified."""
        address = await self.get_user_address(db, address_id=address_id, user_id=user_id)
        if not address:
            return None
        
        old_verified = address.is_verified
        address.is_verified = True
        db.add(address)
        await db.commit()
        await db.refresh(address)
        
        # Log the verification
        await AuditService.log_address_action(
            db=db,
            user_id=user_id,
            action="verify",
            address_id=address_id,
            old_values={"is_verified": old_verified},
            new_values={"is_verified": True},
            request=request
        )
        
        return address


address = CRUDAddress(Address)