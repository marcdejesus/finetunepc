from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_active_user, get_current_superuser
from app.core.database import get_db
from app.crud import order
from app.models.user import User
from app.schemas.order import Order, OrderCreate, OrderUpdate

router = APIRouter()


@router.get("/", response_model=List[Order])
async def read_orders(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
):
    if current_user.is_superuser:
        orders = await order.get_multi(db, skip=skip, limit=limit)
    else:
        orders = await order.get_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return orders


@router.post("/", response_model=Order)
async def create_order(
    *,
    db: AsyncSession = Depends(get_db),
    order_in: OrderCreate,
    current_user: User = Depends(get_current_active_user),
):
    order_obj = await order.create_with_items(db, obj_in=order_in, user_id=current_user.id)
    return order_obj


@router.get("/{order_id}", response_model=Order)
async def read_order(
    *,
    db: AsyncSession = Depends(get_db),
    order_id: int,
    current_user: User = Depends(get_current_active_user),
):
    db_order = await order.get_with_items(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return db_order


@router.put("/{order_id}", response_model=Order)
async def update_order(
    *,
    db: AsyncSession = Depends(get_db),
    order_id: int,
    order_in: OrderUpdate,
    current_user: User = Depends(get_current_active_user),
):
    db_order = await order.get(db, id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    order_obj = await order.update(db, db_obj=db_order, obj_in=order_in)
    return order_obj