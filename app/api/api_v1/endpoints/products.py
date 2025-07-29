from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_active_user, get_current_superuser
from app.core.database import get_db
from app.crud import product, category
from app.models.user import User
from app.schemas.product import Product, ProductCreate, ProductUpdate, Category, CategoryCreate, CategoryUpdate

router = APIRouter()


@router.get("/", response_model=List[Product])
async def read_products(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    products = await product.get_active_products(db, skip=skip, limit=limit)
    return products


@router.post("/", response_model=Product)
async def create_product(
    *,
    db: AsyncSession = Depends(get_db),
    product_in: ProductCreate,
    current_user: User = Depends(get_current_superuser),
):
    if product_in.sku:
        db_product = await product.get_by_sku(db, sku=product_in.sku)
        if db_product:
            raise HTTPException(
                status_code=400,
                detail="The product with this SKU already exists in the system.",
            )
    product_obj = await product.create(db, obj_in=product_in)
    return product_obj


@router.get("/{product_id}", response_model=Product)
async def read_product(
    *,
    db: AsyncSession = Depends(get_db),
    product_id: int,
):
    db_product = await product.get(db, id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product


@router.put("/{product_id}", response_model=Product)
async def update_product(
    *,
    db: AsyncSession = Depends(get_db),
    product_id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(get_current_superuser),
):
    db_product = await product.get(db, id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    product_obj = await product.update(db, db_obj=db_product, obj_in=product_in)
    return product_obj


@router.delete("/{product_id}", response_model=Product)
async def delete_product(
    *,
    db: AsyncSession = Depends(get_db),
    product_id: int,
    current_user: User = Depends(get_current_superuser),
):
    db_product = await product.get(db, id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    product_obj = await product.remove(db, id=product_id)
    return product_obj


@router.get("/categories/", response_model=List[Category])
async def read_categories(
    db: AsyncSession = Depends(get_db),
):
    categories = await category.get_active_categories(db)
    return categories


@router.post("/categories/", response_model=Category)
async def create_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_superuser),
):
    db_category = await category.get_by_name(db, name=category_in.name)
    if db_category:
        raise HTTPException(
            status_code=400,
            detail="The category with this name already exists in the system.",
        )
    category_obj = await category.create(db, obj_in=category_in)
    return category_obj