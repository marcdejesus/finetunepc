from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.crud.base import CRUDBase
from app.models.product import Product, Category
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate


class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    async def get_by_sku(self, db: AsyncSession, *, sku: str) -> Optional[Product]:
        result = await db.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def get_by_category(self, db: AsyncSession, *, category_id: int) -> List[Product]:
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.category_id == category_id)
        )
        return result.scalars().all()

    async def get_active_products(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Product]:
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.category))
            .where(Product.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()


class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[Category]:
        result = await db.execute(select(Category).where(Category.name == name))
        return result.scalar_one_or_none()

    async def get_active_categories(self, db: AsyncSession) -> List[Category]:
        result = await db.execute(select(Category).where(Category.is_active == True))
        return result.scalars().all()


product = CRUDProduct(Product)
category = CRUDCategory(Category)