"""Unit tests for SQLAlchemy models."""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from app.models import (
    User, UserSession, Address, Category, Product, ProductVariant,
    ProductImage, Inventory, Cart, CartItem, Order, OrderItem,
    Payment, Coupon, Shipment
)
from app.core.security import PasswordManager
from tests.fixtures.factories import (
    UserFactory, UserSessionFactory, AddressFactory, CategoryFactory,
    ProductFactory, ProductVariantFactory, InventoryFactory, CartFactory,
    CartItemFactory, OrderFactory, PaymentFactory, CouponFactory
)


@pytest.mark.unit
class TestUserModel:
    """Test User model functionality."""
    
    def test_create_user(self):
        """Test creating a user instance."""
        user = UserFactory()
        
        assert user.id is not None
        assert "@" in user.email
        assert user.first_name is not None
        assert user.last_name is not None
        assert user.hashed_password is not None
        assert user.is_active is True
        assert user.email_verified is True
        assert user.created_at is not None
    
    def test_user_password_hashing(self):
        """Test password hashing functionality."""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        user = UserFactory(hashed_password=hashed)
        
        assert user.hashed_password != password
        assert PasswordManager.verify_password(password, user.hashed_password)
        assert not PasswordManager.verify_password("wrong_password", user.hashed_password)
    
    def test_user_full_name_property(self):
        """Test full name property."""
        user = UserFactory(first_name="John", last_name="Doe")
        assert user.full_name == "John Doe"
    
    def test_user_soft_delete(self):
        """Test soft delete functionality."""
        user = UserFactory()
        assert user.deleted_at is None
        assert user.is_deleted is False
        
        user.deleted_at = datetime.utcnow()
        assert user.is_deleted is True
    
    def test_user_stripe_integration(self):
        """Test Stripe customer ID handling."""
        user = UserFactory()
        assert user.stripe_customer_id is not None
        assert user.stripe_customer_id.startswith("cus_")


@pytest.mark.unit
class TestUserSessionModel:
    """Test UserSession model functionality."""
    
    def test_create_user_session(self):
        """Test creating a user session."""
        user = UserFactory()
        session = UserSessionFactory(user_id=user.id)
        
        assert session.id is not None
        assert session.user_id == user.id
        assert session.access_token_hash is not None
        assert session.refresh_token_hash is not None
        assert session.is_active is True
    
    def test_session_token_expiry(self):
        """Test token expiry checking."""
        session = UserSessionFactory()
        
        # Test non-expired token
        assert not session.is_access_token_expired()
        assert not session.is_refresh_token_expired()
        
        # Test expired access token
        session.access_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        assert session.is_access_token_expired()
        
        # Test expired refresh token
        session.refresh_token_expires_at = datetime.utcnow() - timedelta(days=1)
        assert session.is_refresh_token_expired()
    
    def test_session_device_info(self):
        """Test device information storage."""
        session = UserSessionFactory(
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Agent",
            device_fingerprint="test_fingerprint"
        )
        
        assert session.ip_address == "192.168.1.1"
        assert "Mozilla" in session.user_agent
        assert session.device_fingerprint == "test_fingerprint"


@pytest.mark.unit
class TestAddressModel:
    """Test Address model functionality."""
    
    def test_create_address(self):
        """Test creating an address."""
        user = UserFactory()
        address = AddressFactory(user_id=user.id)
        
        assert address.id is not None
        assert address.user_id == user.id
        assert address.address_type in ["shipping", "billing"]
        assert address.country is not None
    
    def test_address_full_name(self):
        """Test address full name property."""
        address = AddressFactory(first_name="John", last_name="Doe")
        assert address.full_name == "John Doe"
    
    def test_address_formatting(self):
        """Test address formatting."""
        address = AddressFactory(
            address_line_1="123 Main St",
            address_line_2="Apt 4B",
            city="New York",
            state="NY",
            postal_code="10001"
        )
        
        formatted = address.formatted_address
        assert "123 Main St" in formatted
        assert "Apt 4B" in formatted
        assert "New York, NY 10001" in formatted


@pytest.mark.unit
class TestCategoryModel:
    """Test Category model functionality."""
    
    def test_create_category(self):
        """Test creating a category."""
        category = CategoryFactory()
        
        assert category.id is not None
        assert category.name is not None
        assert category.slug is not None
        assert category.is_active is True
    
    def test_category_hierarchy(self):
        """Test category parent-child relationships."""
        parent = CategoryFactory(name="Electronics")
        child = CategoryFactory(name="Smartphones", parent_id=parent.id)
        
        assert child.parent_id == parent.id
    
    def test_category_slug_generation(self):
        """Test automatic slug generation."""
        category = CategoryFactory(name="Test Category Name")
        assert category.slug == "test-category-name"


@pytest.mark.unit
class TestProductModel:
    """Test Product model functionality."""
    
    def test_create_product(self):
        """Test creating a product."""
        category = CategoryFactory()
        product = ProductFactory(category_id=category.id)
        
        assert product.id is not None
        assert product.name is not None
        assert product.sku_prefix is not None
        assert isinstance(product.base_price, Decimal)
        assert product.category_id == category.id
        assert product.is_active is True
    
    def test_product_pricing(self):
        """Test product pricing calculations."""
        product = ProductFactory(
            price=Decimal("99.99"),
            compare_at_price=Decimal("129.99"),
            cost_price=Decimal("50.00")
        )
        
        assert product.price == Decimal("99.99")
        assert product.compare_at_price == Decimal("129.99")
        assert product.cost_price == Decimal("50.00")
    
    def test_product_dimensions(self):
        """Test product dimensions storage."""
        product = ProductFactory(
            weight=Decimal("1.5"),
            dimensions={"length": 10.0, "width": 8.0, "height": 5.0}
        )
        
        assert product.weight == Decimal("1.5")
        assert product.dimensions["length"] == 10.0
        assert product.dimensions["width"] == 8.0
        assert product.dimensions["height"] == 5.0
    
    def test_product_stripe_integration(self):
        """Test Stripe product ID handling."""
        product = ProductFactory()
        assert product.stripe_product_id is not None
        assert product.stripe_product_id.startswith("prod_")


@pytest.mark.unit
class TestProductVariantModel:
    """Test ProductVariant model functionality."""
    
    def test_create_product_variant(self):
        """Test creating a product variant."""
        product = ProductFactory()
        variant = ProductVariantFactory(product_id=product.id)
        
        assert variant.id is not None
        assert variant.product_id == product.id
        assert variant.title is not None
        assert variant.sku is not None
        assert isinstance(variant.price, Decimal)
    
    def test_variant_attributes(self):
        """Test variant attributes storage."""
        variant = ProductVariantFactory(
            attributes={"color": "Red", "size": "Large", "material": "Cotton"}
        )
        
        assert variant.attributes["color"] == "Red"
        assert variant.attributes["size"] == "Large"
        assert variant.attributes["material"] == "Cotton"
    
    def test_variant_pricing_inheritance(self):
        """Test variant pricing relationship with product."""
        product = ProductFactory(price=Decimal("100.00"))
        variant = ProductVariantFactory(
            product_id=product.id,
            price=Decimal("99.99")
        )
        
        # Variant can have its own price
        assert variant.price == Decimal("99.99")
        assert product.price == Decimal("100.00")


@pytest.mark.unit
class TestInventoryModel:
    """Test Inventory model functionality."""
    
    def test_create_inventory(self):
        """Test creating inventory record."""
        variant = ProductVariantFactory()
        inventory = InventoryFactory(product_variant_id=variant.id)
        
        assert inventory.id is not None
        assert inventory.product_variant_id == variant.id
        assert inventory.quantity_available >= 0
        assert inventory.reserved_quantity >= 0
    
    def test_inventory_stock_calculations(self):
        """Test stock calculation methods."""
        inventory = InventoryFactory(
            quantity_available=100,
            reserved_quantity=20
        )
        
        assert inventory.available_quantity == 80
        assert inventory.total_quantity == 100
        assert inventory.can_fulfill_quantity(80) is True
        assert inventory.can_fulfill_quantity(90) is False
    
    def test_inventory_stock_operations(self):
        """Test stock reservation and release."""
        inventory = InventoryFactory(
            quantity_available=100,
            reserved_quantity=0
        )
        
        # Test stock reservation
        order_id = str(uuid4())
        success = inventory.reserve_stock(20, order_id)
        assert success is True
        assert inventory.reserved_quantity == 20
        assert inventory.available_quantity == 80
        
        # Test stock release
        inventory.release_stock(10, order_id)
        assert inventory.reserved_quantity == 10
        assert inventory.available_quantity == 90
    
    def test_inventory_stock_fulfillment(self):
        """Test stock fulfillment."""
        inventory = InventoryFactory(
            quantity_available=100,
            reserved_quantity=20
        )
        
        inventory.fulfill_stock(15)
        assert inventory.quantity_available == 85
        assert inventory.reserved_quantity == 5


@pytest.mark.unit
class TestCartModel:
    """Test Cart model functionality."""
    
    def test_create_cart(self):
        """Test creating a cart."""
        user = UserFactory()
        cart = CartFactory(user_id=user.id)
        
        assert cart.id is not None
        assert cart.user_id == user.id
        assert cart.created_at is not None
    
    def test_anonymous_cart(self):
        """Test anonymous cart creation."""
        cart = CartFactory(user_id=None, session_id="anonymous_session_123")
        
        assert cart.user_id is None
        assert cart.session_id == "anonymous_session_123"


@pytest.mark.unit
class TestCartItemModel:
    """Test CartItem model functionality."""
    
    def test_create_cart_item(self):
        """Test creating a cart item."""
        cart = CartFactory()
        variant = ProductVariantFactory()
        item = CartItemFactory(
            cart_id=cart.id,
            variant_id=variant.id,
            quantity=2,
            unit_price=Decimal("99.99")
        )
        
        assert item.id is not None
        assert item.cart_id == cart.id
        assert item.variant_id == variant.id
        assert item.quantity == 2
        assert item.unit_price == Decimal("99.99")
    
    def test_cart_item_total_calculation(self):
        """Test cart item total price calculation."""
        item = CartItemFactory(
            quantity=3,
            unit_price=Decimal("29.99")
        )
        
        assert item.total_price == Decimal("89.97")


@pytest.mark.unit
class TestOrderModel:
    """Test Order model functionality."""
    
    def test_create_order(self):
        """Test creating an order."""
        user = UserFactory()
        order = OrderFactory(user_id=user.id)
        
        assert order.id is not None
        assert order.user_id == user.id
        assert order.order_number is not None
        assert order.status in ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
        assert isinstance(order.total_amount, Decimal)
    
    def test_order_status_management(self):
        """Test order status transitions."""
        order = OrderFactory(status="pending")
        
        assert order.status == "pending"
        assert order.can_cancel() is True
        
        order.status = "shipped"
        assert order.can_cancel() is False
    
    def test_order_address_storage(self):
        """Test order address information."""
        shipping_address = {
            "first_name": "John",
            "last_name": "Doe",
            "address_line_1": "123 Main St",
            "city": "New York",
            "state": "NY",
            "postal_code": "10001",
            "country": "US"
        }
        
        order = OrderFactory(shipping_address=shipping_address)
        
        assert order.shipping_address["first_name"] == "John"
        assert order.shipping_address["city"] == "New York"
    
    def test_order_amount_calculations(self):
        """Test order amount calculations."""
        order = OrderFactory(
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("8.50"),
            shipping_amount=Decimal("10.00"),
            discount_amount=Decimal("5.00")
        )
        
        expected_total = Decimal("113.50")  # 100 + 8.50 + 10 - 5
        assert order.calculate_total() == expected_total


@pytest.mark.unit
class TestPaymentModel:
    """Test Payment model functionality."""
    
    def test_create_payment(self):
        """Test creating a payment record."""
        order = OrderFactory()
        payment = PaymentFactory(order_id=order.id)
        
        assert payment.id is not None
        assert payment.order_id == order.id
        assert payment.stripe_payment_intent_id is not None
        assert isinstance(payment.amount, Decimal)
        assert payment.status in ["pending", "succeeded", "failed", "cancelled"]
    
    def test_payment_method_details(self):
        """Test payment method details storage."""
        payment = PaymentFactory(
            payment_method="card",
            payment_method_details={
                "type": "card",
                "card": {
                    "brand": "visa",
                    "last4": "4242",
                    "exp_month": 12,
                    "exp_year": 2025
                }
            }
        )
        
        assert payment.payment_method == "card"
        assert payment.payment_method_details["card"]["brand"] == "visa"
        assert payment.payment_method_details["card"]["last4"] == "4242"


@pytest.mark.unit
class TestCouponModel:
    """Test Coupon model functionality."""
    
    def test_create_coupon(self):
        """Test creating a coupon."""
        coupon = CouponFactory()
        
        assert coupon.id is not None
        assert coupon.code is not None
        assert coupon.type in ["percentage", "fixed_amount"]
        assert isinstance(coupon.value, Decimal)
        assert coupon.is_active is True
    
    def test_coupon_validation(self):
        """Test coupon validation logic."""
        coupon = CouponFactory(
            usage_limit=10,
            used_count=5,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        assert coupon.is_valid() is True
        assert coupon.can_be_used() is True
        
        # Test expired coupon
        coupon.expires_at = datetime.utcnow() - timedelta(days=1)
        assert coupon.is_valid() is False
        
        # Test usage limit reached
        coupon.expires_at = datetime.utcnow() + timedelta(days=30)
        coupon.used_count = 10
        assert coupon.can_be_used() is False
    
    def test_coupon_discount_calculation(self):
        """Test coupon discount calculations."""
        # Test percentage coupon
        percentage_coupon = CouponFactory(
            type="percentage",
            value=Decimal("10.00"),
            maximum_discount=Decimal("50.00")
        )
        
        discount = percentage_coupon.calculate_discount(Decimal("100.00"))
        assert discount == Decimal("10.00")
        
        # Test maximum discount limit
        discount = percentage_coupon.calculate_discount(Decimal("1000.00"))
        assert discount == Decimal("50.00")
        
        # Test fixed amount coupon
        fixed_coupon = CouponFactory(
            type="fixed_amount",
            value=Decimal("25.00")
        )
        
        discount = fixed_coupon.calculate_discount(Decimal("100.00"))
        assert discount == Decimal("25.00")
        
        # Test fixed amount doesn't exceed order total
        discount = fixed_coupon.calculate_discount(Decimal("10.00"))
        assert discount == Decimal("10.00")
    
    def test_coupon_minimum_amount(self):
        """Test coupon minimum amount requirement."""
        coupon = CouponFactory(
            minimum_amount=Decimal("50.00"),
            value=Decimal("10.00")
        )
        
        assert coupon.is_applicable(Decimal("60.00")) is True
        assert coupon.is_applicable(Decimal("40.00")) is False