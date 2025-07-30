from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus
from app.schemas.product import ProductResponse


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    order_id: int
    product: Optional[ProductResponse] = None


class OrderBase(BaseModel):
    shipping_address: Optional[str] = None


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    shipping_address: Optional[str] = None


class Order(OrderBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    total_amount: Decimal
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    order_items: List[OrderItem] = []