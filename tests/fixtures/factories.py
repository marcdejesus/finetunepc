"""Test data factories using Factory Boy pattern."""

import factory
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from app.models import (
    User, UserSession, Address, Category, Product, ProductVariant,
    ProductImage, Inventory, Cart, CartItem, Order, OrderItem,
    Payment, Refund, Shipment, Coupon
)
from app.core.security import PasswordManager


class UserFactory(factory.Factory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    phone_number = factory.Faker("phone_number")
    hashed_password = factory.LazyAttribute(
        lambda obj: PasswordManager.hash_password("TestPassword123!")
    )
    email_verified = True
    is_active = True
    is_superuser = False
    stripe_customer_id = factory.LazyFunction(lambda: f"cus_{uuid4().hex[:24]}")
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)
    deleted_at = None


class SuperuserFactory(UserFactory):
    """Factory for creating superuser instances."""
    
    is_superuser = True
    email = factory.Sequence(lambda n: f"admin{n}@example.com")


class UserSessionFactory(factory.Factory):
    """Factory for creating UserSession instances."""
    
    class Meta:
        model = UserSession
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    user_id = factory.SubFactory(UserFactory)
    access_token_hash = factory.Faker("sha256")
    refresh_token_hash = factory.Faker("sha256")
    access_token_expires_at = factory.LazyFunction(
        lambda: datetime.utcnow() + timedelta(minutes=30)
    )
    refresh_token_expires_at = factory.LazyFunction(
        lambda: datetime.utcnow() + timedelta(days=30)
    )
    ip_address = factory.Faker("ipv4")
    user_agent = factory.Faker("user_agent")
    device_fingerprint = factory.LazyFunction(lambda: uuid4().hex)
    is_active = True
    last_used_at = factory.LazyFunction(datetime.utcnow)
    created_at = factory.LazyFunction(datetime.utcnow)


class AddressFactory(factory.Factory):
    """Factory for creating Address instances."""
    
    class Meta:
        model = Address
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    user_id = factory.SubFactory(UserFactory)
    address_type = "shipping"
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    company = factory.Faker("company")
    address_line_1 = factory.Faker("street_address")
    address_line_2 = factory.Faker("secondary_address")
    city = factory.Faker("city")
    state_province = factory.Faker("state_abbr")
    postal_code = factory.Faker("postcode")
    country = "US"
    phone_number = factory.Faker("phone_number")
    is_default = False
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class CategoryFactory(factory.Factory):
    """Factory for creating Category instances."""
    
    class Meta:
        model = Category
    
    id = factory.Sequence(lambda n: n)
    name = factory.Faker("word")
    description = factory.Faker("text", max_nb_chars=200)
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    image_url = factory.Faker("image_url")
    is_active = True
    sort_order = factory.Sequence(lambda n: n)
    meta_title = factory.LazyAttribute(lambda obj: f"SEO {obj.name}")
    meta_description = factory.Faker("text", max_nb_chars=160)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ProductFactory(factory.Factory):
    """Factory for creating Product instances."""
    
    class Meta:
        model = Product
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    name = factory.Faker("catch_phrase")
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(" ", "-"))
    description = factory.Faker("text")
    short_description = factory.Faker("text", max_nb_chars=200)
    base_price = factory.LazyFunction(lambda: Decimal("99.99"))
    sku_prefix = factory.Faker("lexify", text="PROD")
    brand = factory.Faker("company")
    weight = factory.LazyFunction(lambda: Decimal("1.5"))
    is_active = True
    is_featured = False
    requires_shipping = True
    is_digital = False
    meta_title = factory.LazyAttribute(lambda obj: f"Buy {obj.name}")
    meta_description = factory.Faker("text", max_nb_chars=160)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ProductVariantFactory(factory.Factory):
    """Factory for creating ProductVariant instances."""
    
    class Meta:
        model = ProductVariant
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    product_id = factory.SubFactory(ProductFactory)
    sku = factory.Sequence(lambda n: f"VAR-{n:06d}")
    title = "Default Variant"
    price = factory.LazyFunction(lambda: Decimal("99.99"))
    sale_price = None
    cost_price = factory.LazyFunction(lambda: Decimal("50.00"))
    weight = factory.LazyFunction(lambda: Decimal("1.0"))
    attributes = factory.LazyFunction(
        lambda: {"color": "Red", "size": "Medium"}
    )
    is_active = True
    sort_order = 0
    stripe_price_id = factory.LazyFunction(lambda: f"price_{uuid4().hex[:24]}")
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ProductImageFactory(factory.Factory):
    """Factory for creating ProductImage instances."""
    
    class Meta:
        model = ProductImage
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    product_id = factory.SubFactory(ProductFactory)
    variant_id = None
    image_url = factory.Faker("image_url")
    alt_text = factory.Faker("sentence")
    is_primary = False
    sort_order = factory.Sequence(lambda n: n)
    responsive_urls = factory.LazyFunction(
        lambda: {
            "thumbnail": "https://example.com/thumb.jpg",
            "medium": "https://example.com/medium.jpg",
            "large": "https://example.com/large.jpg"
        }
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class InventoryFactory(factory.Factory):
    """Factory for creating Inventory instances."""
    
    class Meta:
        model = Inventory
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    product_variant_id = factory.SubFactory(ProductVariantFactory)
    quantity_available = 100
    reserved_quantity = 0
    reorder_point = 10
    reorder_quantity = 50
    warehouse_location = factory.Faker("address")
    last_restocked_at = factory.LazyFunction(datetime.utcnow)
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class CartFactory(factory.Factory):
    """Factory for creating Cart instances."""
    
    class Meta:
        model = Cart
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    user_id = factory.SubFactory(UserFactory)
    session_id = None
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class CartItemFactory(factory.Factory):
    """Factory for creating CartItem instances."""
    
    class Meta:
        model = CartItem
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    cart_id = factory.SubFactory(CartFactory)
    variant_id = factory.SubFactory(ProductVariantFactory)
    quantity = 1
    unit_price = factory.LazyFunction(lambda: Decimal("99.99"))
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class OrderFactory(factory.Factory):
    """Factory for creating Order instances."""
    
    class Meta:
        model = Order
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    user_id = factory.SubFactory(UserFactory)
    order_number = factory.Sequence(lambda n: f"ORD-{n:08d}")
    status = "pending"
    subtotal = factory.LazyFunction(lambda: Decimal("99.99"))
    tax_amount = factory.LazyFunction(lambda: Decimal("8.00"))
    shipping_amount = factory.LazyFunction(lambda: Decimal("10.00"))
    discount_amount = factory.LazyFunction(lambda: Decimal("0.00"))
    total_amount = factory.LazyFunction(lambda: Decimal("117.99"))
    currency = "USD"
    notes = None
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class OrderItemFactory(factory.Factory):
    """Factory for creating OrderItem instances."""
    
    class Meta:
        model = OrderItem
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    order_id = factory.SubFactory(OrderFactory)
    variant_id = factory.SubFactory(ProductVariantFactory)
    quantity = 1
    unit_price = factory.LazyFunction(lambda: Decimal("99.99"))
    product_name = factory.Faker("catch_phrase")
    product_slug = factory.Faker("slug")
    variant_sku = factory.Sequence(lambda n: f"VAR-{n:06d}")
    variant_attributes = factory.LazyFunction(
        lambda: {"color": "Red", "size": "Medium"}
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class PaymentFactory(factory.Factory):
    """Factory for creating Payment instances."""
    
    class Meta:
        model = Payment
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    order_id = factory.SubFactory(OrderFactory)
    stripe_payment_intent_id = factory.LazyFunction(lambda: f"pi_{uuid4().hex[:24]}")
    amount = factory.LazyFunction(lambda: Decimal("117.99"))
    currency = "USD"
    status = "succeeded"
    payment_method = "card"
    payment_method_details = factory.LazyFunction(
        lambda: {
            "type": "card",
            "card": {
                "brand": "visa",
                "last4": "4242",
                "exp_month": 12,
                "exp_year": 2025
            }
        }
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class CouponFactory(factory.Factory):
    """Factory for creating Coupon instances."""
    
    class Meta:
        model = Coupon
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    code = factory.Sequence(lambda n: f"SAVE{n:02d}")
    type = "percentage"
    value = factory.LazyFunction(lambda: Decimal("10.00"))
    minimum_amount = None
    maximum_discount = None
    usage_limit = None
    used_count = 0
    is_active = True
    starts_at = factory.LazyFunction(datetime.utcnow)
    expires_at = factory.LazyFunction(
        lambda: datetime.utcnow() + timedelta(days=30)
    )
    stripe_coupon_id = factory.LazyFunction(lambda: f"coup_{uuid4().hex[:24]}")
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ShipmentFactory(factory.Factory):
    """Factory for creating Shipment instances."""
    
    class Meta:
        model = Shipment
    
    id = factory.LazyFunction(lambda: str(uuid4()))
    order_id = factory.SubFactory(OrderFactory)
    carrier = "UPS"
    service = "Ground"
    tracking_number = factory.Sequence(lambda n: f"1Z999AA1{n:010d}")
    status = "in_transit"
    shipped_at = factory.LazyFunction(datetime.utcnow)
    estimated_delivery_at = factory.LazyFunction(
        lambda: datetime.utcnow() + timedelta(days=3)
    )
    delivered_at = None
    shipping_cost = factory.LazyFunction(lambda: Decimal("10.00"))
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


# Factory helpers
class FactoryHelper:
    """Helper methods for creating complex test data scenarios."""
    
    @staticmethod
    def create_user_with_addresses(address_count: int = 2) -> User:
        """Create a user with multiple addresses."""
        user = UserFactory()
        addresses = [AddressFactory(user_id=user.id) for _ in range(address_count)]
        if addresses:
            addresses[0].is_default = True
        return user
    
    @staticmethod
    def create_product_with_variants(variant_count: int = 3) -> Product:
        """Create a product with multiple variants and inventory."""
        category = CategoryFactory()
        product = ProductFactory(category_id=category.id)
        
        variants = []
        for i in range(variant_count):
            variant = ProductVariantFactory(
                product_id=product.id,
                name=f"Variant {i+1}",
                attributes={"color": ["Red", "Blue", "Green"][i % 3]}
            )
            InventoryFactory(product_variant_id=variant.id)
            variants.append(variant)
        
        # Add product images
        ProductImageFactory(product_id=product.id, is_primary=True)
        ProductImageFactory(product_id=product.id)
        
        return product
    
    @staticmethod
    def create_cart_with_items(user: Optional[User] = None, item_count: int = 2) -> Cart:
        """Create a cart with multiple items."""
        if not user:
            user = UserFactory()
        
        cart = CartFactory(user_id=user.id)
        
        for _ in range(item_count):
            product = FactoryHelper.create_product_with_variants(1)
            variant = product.variants[0]
            CartItemFactory(
                cart_id=cart.id,
                product_variant_id=variant.id,
                quantity=factory.Faker("random_int", min=1, max=5).generate({})
            )
        
        return cart
    
    @staticmethod
    def create_complete_order(user: Optional[User] = None) -> Order:
        """Create a complete order with items, payment, and shipment."""
        if not user:
            user = UserFactory()
        
        order = OrderFactory(user_id=user.id, status="completed")
        
        # Add order items
        for _ in range(2):
            product = FactoryHelper.create_product_with_variants(1)
            variant = product.variants[0]
            OrderItemFactory(
                order_id=order.id,
                product_variant_id=variant.id
            )
        
        # Add payment
        PaymentFactory(order_id=order.id)
        
        # Add shipment
        ShipmentFactory(order_id=order.id)
        
        return order