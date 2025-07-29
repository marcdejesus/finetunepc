from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_active_user, get_current_superuser
from app.core.database import get_db
from app.crud import user
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate

router = APIRouter()


@router.get("/", response_model=List[UserSchema])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_superuser),
):
    users = await user.get_multi(db, skip=skip, limit=limit)
    return users


@router.post("/", response_model=UserSchema)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
):
    db_user = await user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    db_user = await user.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user_obj = await user.create(db, obj_in=user_in)
    return user_obj


@router.get("/{user_id}", response_model=UserSchema)
async def read_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_user),
):
    db_user = await user.get(db, id=user_id)
    if db_user == current_user:
        return db_user
    if not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return db_user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
):
    db_user = await user.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user != current_user and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    user_obj = await user.update(db, db_obj=db_user, obj_in=user_in)
    return user_obj