from typing import List, Optional
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, get_current_superuser
from app.core.database import get_db
from app.crud import user, address
from app.models.user import User
from app.schemas.user import (
    UserProfileResponse, 
    UserUpdate, 
    UserPasswordChange,
    AddressCreate,
    AddressUpdate,
    AddressResponse,
    AddressListResponse
)

router = APIRouter()


# User Profile Management
@router.get("/profile", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's profile information."""
    return current_user


@router.put("/profile", response_model=UserProfileResponse)
async def update_current_user_profile(
    *,
    db: AsyncSession = Depends(get_db),
    user_update: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Update current user's profile information."""
    updated_user = await user.update_profile(
        db=db,
        db_obj=current_user,
        obj_in=user_update,
        request=request
    )
    return updated_user


@router.post("/change-password")
async def change_password(
    *,
    db: AsyncSession = Depends(get_db),
    password_data: UserPasswordChange,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Change current user's password."""
    await user.change_password(
        db=db,
        user=current_user,
        password_data=password_data,
        request=request
    )
    return {"message": "Password changed successfully"}


# Address Management
@router.get("/addresses", response_model=AddressListResponse)
async def get_user_addresses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    address_type: Optional[str] = Query(None, description="Filter by address type: billing, shipping, or both"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
):
    """Get current user's addresses with pagination."""
    skip = (page - 1) * size
    
    addresses = await address.get_by_user(
        db=db,
        user_id=current_user.id,
        address_type=address_type,
        skip=skip,
        limit=size
    )
    
    total = await address.count_by_user(
        db=db,
        user_id=current_user.id,
        address_type=address_type
    )
    
    pages = ceil(total / size) if total > 0 else 1
    
    return AddressListResponse(
        addresses=addresses,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_user_address(
    *,
    db: AsyncSession = Depends(get_db),
    address_in: AddressCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new address for the current user."""
    new_address = await address.create_for_user(
        db=db,
        obj_in=address_in,
        user_id=current_user.id,
        request=request
    )
    return new_address


@router.put("/addresses/{address_id}", response_model=AddressResponse)
async def update_user_address(
    *,
    db: AsyncSession = Depends(get_db),
    address_id: str,
    address_update: AddressUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Update a specific address belonging to the current user."""
    db_address = await address.get_user_address(
        db=db,
        address_id=address_id,
        user_id=current_user.id
    )
    
    if not db_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    updated_address = await address.update_user_address(
        db=db,
        db_obj=db_address,
        obj_in=address_update,
        request=request
    )
    return updated_address


@router.delete("/addresses/{address_id}")
async def delete_user_address(
    *,
    db: AsyncSession = Depends(get_db),
    address_id: str,
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a specific address belonging to the current user."""
    deleted_address = await address.delete_user_address(
        db=db,
        address_id=address_id,
        user_id=current_user.id,
        request=request
    )
    
    if not deleted_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    return {"message": "Address deleted successfully"}


@router.post("/addresses/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    *,
    db: AsyncSession = Depends(get_db),
    address_id: str,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    address_type: Optional[str] = Query(None, description="Set as default for specific type: billing, shipping"),
):
    """Set an address as the default for the current user."""
    try:
        default_address = await address.set_default_address(
            db=db,
            address_id=address_id,
            user_id=current_user.id,
            address_type=address_type,
            request=request
        )
        
        if not default_address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return default_address
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Admin-only endpoints
@router.get("/", response_model=List[UserProfileResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_superuser),
):
    """List all users (admin only)."""
    users = await user.get_multi(db, skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_by_id(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific user by ID (own profile or admin only)."""
    db_user = await user.get(db, id=user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Users can access their own profile, admins can access any profile
    if db_user.id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return db_user


@router.delete("/{user_id}")
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_superuser),
):
    """Soft delete a user (admin only)."""
    deleted_user = await user.soft_delete(
        db=db,
        user_id=user_id,
        deleted_by_user_id=current_user.id,
        request=request
    )
    
    if not deleted_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already deleted"
        )
    
    return {"message": "User deleted successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_superuser),
):
    """Activate a user account (admin only)."""
    db_user = await user.get(db, id=user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    activated_user = await user.activate_user(
        db=db,
        user=db_user,
        activated_by_user_id=current_user.id,
        request=request
    )
    
    return {"message": "User activated successfully"}


@router.post("/{user_id}/deactivate")
async def deactivate_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: str,
    request: Request,
    current_user: User = Depends(get_current_superuser),
):
    """Deactivate a user account (admin only)."""
    db_user = await user.get(db, id=user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    deactivated_user = await user.deactivate_user(
        db=db,
        user=db_user,
        deactivated_by_user_id=current_user.id,
        request=request
    )
    
    return {"message": "User deactivated successfully"}