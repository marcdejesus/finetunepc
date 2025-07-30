"""Mock objects for external services."""

from unittest.mock import Mock, AsyncMock
from typing import Dict, Any, Optional
from decimal import Decimal


class MockStripeClient:
    """Mock Stripe client for testing."""
    
    def __init__(self):
        self.customers = MockStripeCustomers()
        self.payment_intents = MockStripePaymentIntents()
        self.prices = MockStripePrices()
        self.products = MockStripeProducts()
        self.coupons = MockStripeCoupons()
        self.refunds = MockStripeRefunds()
        self.webhooks = MockStripeWebhooks()
    
    def reset_mocks(self):
        """Reset all mock data."""
        self.customers.reset()
        self.payment_intents.reset()
        self.prices.reset()
        self.products.reset()
        self.coupons.reset()
        self.refunds.reset()


class MockStripeCustomers:
    """Mock Stripe Customers API."""
    
    def __init__(self):
        self._customers = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock customer."""
        customer_id = f"cus_mock{self._next_id:06d}"
        self._next_id += 1
        
        customer = {
            "id": customer_id,
            "email": kwargs.get("email"),
            "name": kwargs.get("name"),
            "phone": kwargs.get("phone"),
            "metadata": kwargs.get("metadata", {}),
            "created": 1634567890,
            "currency": "usd",
            "default_source": None,
            "delinquent": False,
            "description": kwargs.get("description"),
            "discount": None,
            "invoice_prefix": customer_id.upper(),
            "livemode": False,
            "object": "customer",
            "shipping": kwargs.get("shipping"),
            "sources": {"object": "list", "data": [], "has_more": False, "total": 0, "url": f"/v1/customers/{customer_id}/sources"},
            "subscriptions": {"object": "list", "data": [], "has_more": False, "total": 0, "url": f"/v1/customers/{customer_id}/subscriptions"},
            "tax_exempt": "none",
            "tax_ids": {"object": "list", "data": [], "has_more": False, "total": 0, "url": f"/v1/customers/{customer_id}/tax_ids"}
        }
        
        self._customers[customer_id] = customer
        return customer
    
    def retrieve(self, customer_id: str) -> Dict[str, Any]:
        """Retrieve a mock customer."""
        if customer_id not in self._customers:
            raise Exception(f"No such customer: {customer_id}")
        return self._customers[customer_id]
    
    def update(self, customer_id: str, **kwargs) -> Dict[str, Any]:
        """Update a mock customer."""
        if customer_id not in self._customers:
            raise Exception(f"No such customer: {customer_id}")
        
        customer = self._customers[customer_id]
        for key, value in kwargs.items():
            if key in customer:
                customer[key] = value
        
        return customer
    
    def delete(self, customer_id: str) -> Dict[str, Any]:
        """Delete a mock customer."""
        if customer_id not in self._customers:
            raise Exception(f"No such customer: {customer_id}")
        
        del self._customers[customer_id]
        return {"id": customer_id, "deleted": True, "object": "customer"}
    
    def reset(self):
        """Reset mock data."""
        self._customers = {}
        self._next_id = 1


class MockStripePaymentIntents:
    """Mock Stripe Payment Intents API."""
    
    def __init__(self):
        self._payment_intents = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock payment intent."""
        pi_id = f"pi_mock{self._next_id:024d}"
        self._next_id += 1
        
        payment_intent = {
            "id": pi_id,
            "object": "payment_intent",
            "amount": kwargs.get("amount"),
            "amount_capturable": 0,
            "amount_received": 0,
            "application": None,
            "application_fee_amount": None,
            "canceled_at": None,
            "cancellation_reason": None,
            "capture_method": kwargs.get("capture_method", "automatic"),
            "charges": {"object": "list", "data": [], "has_more": False, "total": 0, "url": f"/v1/charges?payment_intent={pi_id}"},
            "client_secret": f"{pi_id}_secret_{self._next_id}",
            "confirmation_method": kwargs.get("confirmation_method", "automatic"),
            "created": 1634567890,
            "currency": kwargs.get("currency", "usd"),
            "customer": kwargs.get("customer"),
            "description": kwargs.get("description"),
            "invoice": None,
            "last_payment_error": None,
            "livemode": False,
            "metadata": kwargs.get("metadata", {}),
            "next_action": None,
            "on_behalf_of": None,
            "payment_method": None,
            "payment_method_options": {},
            "payment_method_types": kwargs.get("payment_method_types", ["card"]),
            "receipt_email": kwargs.get("receipt_email"),
            "review": None,
            "setup_future_usage": None,
            "shipping": kwargs.get("shipping"),
            "source": None,
            "statement_descriptor": None,
            "statement_descriptor_suffix": None,
            "status": "requires_payment_method",
            "transfer_data": None,
            "transfer_group": None
        }
        
        self._payment_intents[pi_id] = payment_intent
        return payment_intent
    
    def retrieve(self, payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve a mock payment intent."""
        if payment_intent_id not in self._payment_intents:
            raise Exception(f"No such payment_intent: {payment_intent_id}")
        return self._payment_intents[payment_intent_id]
    
    def confirm(self, payment_intent_id: str, **kwargs) -> Dict[str, Any]:
        """Confirm a mock payment intent."""
        if payment_intent_id not in self._payment_intents:
            raise Exception(f"No such payment_intent: {payment_intent_id}")
        
        payment_intent = self._payment_intents[payment_intent_id]
        payment_intent["status"] = "succeeded"
        payment_intent["amount_received"] = payment_intent["amount"]
        
        # Add mock charge
        charge = {
            "id": f"ch_mock{self._next_id:024d}",
            "object": "charge",
            "amount": payment_intent["amount"],
            "amount_captured": payment_intent["amount"],
            "amount_refunded": 0,
            "application": None,
            "application_fee": None,
            "application_fee_amount": None,
            "balance_transaction": f"txn_mock{self._next_id:024d}",
            "billing_details": kwargs.get("billing_details", {}),
            "calculated_statement_descriptor": None,
            "captured": True,
            "created": 1634567890,
            "currency": payment_intent["currency"],
            "customer": payment_intent["customer"],
            "description": payment_intent["description"],
            "destination": None,
            "dispute": None,
            "disputed": False,
            "failure_code": None,
            "failure_message": None,
            "fraud_details": {},
            "invoice": None,
            "livemode": False,
            "metadata": payment_intent["metadata"],
            "on_behalf_of": None,
            "order": None,
            "outcome": {
                "network_status": "approved_by_network",
                "reason": None,
                "risk_level": "normal",
                "risk_score": 75,
                "seller_message": "Payment complete.",
                "type": "authorized"
            },
            "paid": True,
            "payment_intent": payment_intent_id,
            "payment_method": kwargs.get("payment_method"),
            "payment_method_details": {
                "card": {
                    "brand": "visa",
                    "checks": {
                        "address_line1_check": None,
                        "address_postal_code_check": None,
                        "cvc_check": "pass"
                    },
                    "country": "US",
                    "exp_month": 12,
                    "exp_year": 2025,
                    "fingerprint": "fingerprint123",
                    "funding": "credit",
                    "installments": None,
                    "last4": "4242",
                    "network": "visa",
                    "three_d_secure": None,
                    "wallet": None
                },
                "type": "card"
            },
            "receipt_email": payment_intent["receipt_email"],
            "receipt_number": None,
            "receipt_url": f"https://pay.stripe.com/receipts/mock_receipt_{self._next_id}",
            "refunded": False,
            "refunds": {"object": "list", "data": [], "has_more": False, "total": 0, "url": f"/v1/charges/{charge['id']}/refunds"},
            "review": None,
            "shipping": payment_intent["shipping"],
            "source": None,
            "source_transfer": None,
            "statement_descriptor": None,
            "statement_descriptor_suffix": None,
            "status": "succeeded",
            "transfer_data": None,
            "transfer_group": None
        }
        
        payment_intent["charges"]["data"] = [charge]
        payment_intent["charges"]["total"] = 1
        
        return payment_intent
    
    def cancel(self, payment_intent_id: str) -> Dict[str, Any]:
        """Cancel a mock payment intent."""
        if payment_intent_id not in self._payment_intents:
            raise Exception(f"No such payment_intent: {payment_intent_id}")
        
        payment_intent = self._payment_intents[payment_intent_id]
        payment_intent["status"] = "canceled"
        payment_intent["canceled_at"] = 1634567890
        payment_intent["cancellation_reason"] = "requested_by_customer"
        
        return payment_intent
    
    def reset(self):
        """Reset mock data."""
        self._payment_intents = {}
        self._next_id = 1


class MockStripePrices:
    """Mock Stripe Prices API."""
    
    def __init__(self):
        self._prices = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock price."""
        price_id = f"price_mock{self._next_id:024d}"
        self._next_id += 1
        
        price = {
            "id": price_id,
            "object": "price",
            "active": kwargs.get("active", True),
            "billing_scheme": "per_unit",
            "created": 1634567890,
            "currency": kwargs.get("currency", "usd"),
            "livemode": False,
            "lookup_key": kwargs.get("lookup_key"),
            "metadata": kwargs.get("metadata", {}),
            "nickname": kwargs.get("nickname"),
            "product": kwargs.get("product"),
            "recurring": kwargs.get("recurring"),
            "tax_behavior": "unspecified",
            "tiers_mode": None,
            "transform_quantity": None,
            "type": "one_time",
            "unit_amount": kwargs.get("unit_amount"),
            "unit_amount_decimal": str(kwargs.get("unit_amount", 0))
        }
        
        self._prices[price_id] = price
        return price
    
    def retrieve(self, price_id: str) -> Dict[str, Any]:
        """Retrieve a mock price."""
        if price_id not in self._prices:
            raise Exception(f"No such price: {price_id}")
        return self._prices[price_id]
    
    def reset(self):
        """Reset mock data."""
        self._prices = {}
        self._next_id = 1


class MockStripeProducts:
    """Mock Stripe Products API."""
    
    def __init__(self):
        self._products = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock product."""
        product_id = f"prod_mock{self._next_id:024d}"
        self._next_id += 1
        
        product = {
            "id": product_id,
            "object": "product",
            "active": kwargs.get("active", True),
            "created": 1634567890,
            "default_price": None,
            "description": kwargs.get("description"),
            "images": kwargs.get("images", []),
            "livemode": False,
            "metadata": kwargs.get("metadata", {}),
            "name": kwargs.get("name"),
            "package_dimensions": kwargs.get("package_dimensions"),
            "shippable": kwargs.get("shippable"),
            "statement_descriptor": kwargs.get("statement_descriptor"),
            "tax_code": kwargs.get("tax_code"),
            "type": "good",
            "unit_label": kwargs.get("unit_label"),
            "updated": 1634567890,
            "url": kwargs.get("url")
        }
        
        self._products[product_id] = product
        return product
    
    def retrieve(self, product_id: str) -> Dict[str, Any]:
        """Retrieve a mock product."""
        if product_id not in self._products:
            raise Exception(f"No such product: {product_id}")
        return self._products[product_id]
    
    def reset(self):
        """Reset mock data."""
        self._products = {}
        self._next_id = 1


class MockStripeCoupons:
    """Mock Stripe Coupons API."""
    
    def __init__(self):
        self._coupons = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock coupon."""
        coupon_id = kwargs.get("id", f"coup_mock{self._next_id:024d}")
        self._next_id += 1
        
        coupon = {
            "id": coupon_id,
            "object": "coupon",
            "amount_off": kwargs.get("amount_off"),
            "created": 1634567890,
            "currency": kwargs.get("currency"),
            "duration": kwargs.get("duration", "once"),
            "duration_in_months": kwargs.get("duration_in_months"),
            "livemode": False,
            "max_redemptions": kwargs.get("max_redemptions"),
            "metadata": kwargs.get("metadata", {}),
            "name": kwargs.get("name"),
            "percent_off": kwargs.get("percent_off"),
            "redeem_by": kwargs.get("redeem_by"),
            "times_redeemed": 0,
            "valid": True
        }
        
        self._coupons[coupon_id] = coupon
        return coupon
    
    def retrieve(self, coupon_id: str) -> Dict[str, Any]:
        """Retrieve a mock coupon."""
        if coupon_id not in self._coupons:
            raise Exception(f"No such coupon: {coupon_id}")
        return self._coupons[coupon_id]
    
    def reset(self):
        """Reset mock data."""
        self._coupons = {}
        self._next_id = 1


class MockStripeRefunds:
    """Mock Stripe Refunds API."""
    
    def __init__(self):
        self._refunds = {}
        self._next_id = 1
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """Create a mock refund."""
        refund_id = f"re_mock{self._next_id:024d}"
        self._next_id += 1
        
        refund = {
            "id": refund_id,
            "object": "refund",
            "amount": kwargs.get("amount"),
            "charge": kwargs.get("charge"),
            "created": 1634567890,
            "currency": kwargs.get("currency", "usd"),
            "metadata": kwargs.get("metadata", {}),
            "payment_intent": kwargs.get("payment_intent"),
            "reason": kwargs.get("reason"),
            "receipt_number": None,
            "source_transfer_reversal": None,
            "status": "succeeded",
            "transfer_reversal": None
        }
        
        self._refunds[refund_id] = refund
        return refund
    
    def retrieve(self, refund_id: str) -> Dict[str, Any]:
        """Retrieve a mock refund."""
        if refund_id not in self._refunds:
            raise Exception(f"No such refund: {refund_id}")
        return self._refunds[refund_id]
    
    def reset(self):
        """Reset mock data."""
        self._refunds = {}
        self._next_id = 1


class MockStripeWebhooks:
    """Mock Stripe Webhooks utility."""
    
    def construct_event(self, payload: str, sig_header: str, endpoint_secret: str) -> Dict[str, Any]:
        """Mock webhook event construction."""
        # In a real implementation, this would verify the signature
        # For testing, we'll just return a mock event
        import json
        
        try:
            data = json.loads(payload)
            return {
                "id": f"evt_mock{self._next_id:024d}",
                "object": "event",
                "api_version": "2020-08-27",
                "created": 1634567890,
                "data": data,
                "livemode": False,
                "pending_webhooks": 1,
                "request": {
                    "id": None,
                    "idempotency_key": None
                },
                "type": data.get("type", "payment_intent.succeeded")
            }
        except json.JSONDecodeError:
            raise Exception("Invalid payload")


class MockEmailService:
    """Mock email service for testing."""
    
    def __init__(self):
        self.sent_emails = []
        self.should_fail = False
    
    async def send_verification_email(self, email: str, token: str) -> bool:
        """Mock sending verification email."""
        if self.should_fail:
            return False
        
        self.sent_emails.append({
            "type": "verification",
            "to": email,
            "token": token,
            "sent_at": "2023-01-01T00:00:00Z"
        })
        return True
    
    async def send_password_reset_email(self, email: str, token: str) -> bool:
        """Mock sending password reset email."""
        if self.should_fail:
            return False
        
        self.sent_emails.append({
            "type": "password_reset",
            "to": email,
            "token": token,
            "sent_at": "2023-01-01T00:00:00Z"
        })
        return True
    
    async def send_order_confirmation_email(self, email: str, order_id: str, order_details: Dict[str, Any]) -> bool:
        """Mock sending order confirmation email."""
        if self.should_fail:
            return False
        
        self.sent_emails.append({
            "type": "order_confirmation",
            "to": email,
            "order_id": order_id,
            "order_details": order_details,
            "sent_at": "2023-01-01T00:00:00Z"
        })
        return True
    
    async def send_shipping_notification_email(self, email: str, tracking_number: str) -> bool:
        """Mock sending shipping notification email."""
        if self.should_fail:
            return False
        
        self.sent_emails.append({
            "type": "shipping_notification",
            "to": email,
            "tracking_number": tracking_number,
            "sent_at": "2023-01-01T00:00:00Z"
        })
        return True
    
    def reset(self):
        """Reset mock data."""
        self.sent_emails = []
        self.should_fail = False
    
    def get_sent_emails(self, email_type: Optional[str] = None):
        """Get sent emails, optionally filtered by type."""
        if email_type:
            return [email for email in self.sent_emails if email["type"] == email_type]
        return self.sent_emails


class MockRedisClient:
    """Mock Redis client for testing."""
    
    def __init__(self):
        self._data = {}
        self._expiry = {}
    
    def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        if key in self._expiry:
            import time
            if time.time() > self._expiry[key]:
                del self._data[key]
                del self._expiry[key]
                return None
        
        return self._data.get(key)
    
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set key-value pair with optional expiration."""
        self._data[key] = value
        
        if ex:
            import time
            self._expiry[key] = time.time() + ex
        
        return True
    
    def delete(self, key: str) -> int:
        """Delete key."""
        deleted = 0
        if key in self._data:
            del self._data[key]
            deleted += 1
        if key in self._expiry:
            del self._expiry[key]
        
        return deleted
    
    def exists(self, key: str) -> int:
        """Check if key exists."""
        return 1 if key in self._data else 0
    
    def incr(self, key: str) -> int:
        """Increment key value."""
        current = int(self._data.get(key, 0))
        current += 1
        self._data[key] = str(current)
        return current
    
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for key."""
        if key not in self._data:
            return False
        
        import time
        self._expiry[key] = time.time() + seconds
        return True
    
    def flushall(self) -> bool:
        """Clear all data."""
        self._data.clear()
        self._expiry.clear()
        return True
    
    def reset(self):
        """Reset mock data."""
        self.flushall()


def create_mock_stripe_client() -> MockStripeClient:
    """Create a mock Stripe client."""
    return MockStripeClient()


def create_mock_email_service() -> MockEmailService:
    """Create a mock email service."""
    return MockEmailService()


def create_mock_redis_client() -> MockRedisClient:
    """Create a mock Redis client."""
    return MockRedisClient()