from typing import List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.crud.base import CRUDBase
from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate, OrderUpdate


class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):
    async def create_with_items(self, db: AsyncSession, *, obj_in: OrderCreate, user_id: int) -> Order:
        total_amount = Decimal('0.00')
        for item in obj_in.items:
            total_amount += item.unit_price * item.quantity

        db_order = Order(
            user_id=user_id,
            total_amount=total_amount,
            shipping_address=obj_in.shipping_address,
        )
        db.add(db_order)
        await db.flush()

        for item_data in obj_in.items:
            db_item = OrderItem(
                order_id=db_order.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
            )
            db.add(db_item)

        await db.commit()
        await db.refresh(db_order)
        return db_order

    async def get_by_user(self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Order]:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.order_items).selectinload(OrderItem.product))
            .where(Order.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_with_items(self, db: AsyncSession, *, order_id: int) -> Order:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.order_items).selectinload(OrderItem.product))
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()


order = CRUDOrder(Order)