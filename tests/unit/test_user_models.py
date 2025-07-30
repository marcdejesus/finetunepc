"""Unit tests for user-related models."""

import pytest
from datetime import datetime, timedelta
from app.models.user import User
from app.models.address import Address, AddressType
from app.models.audit_log import AuditLog
from tests.fixtures.factories import UserFactory, AddressFactory, AuditLogFactory


class TestUserModel:
    """Test the User model."""
    
    def test_user_creation(self):
        """Test creating a user instance."""
        user = UserFactory()
        
        assert user.id is not None
        assert "@" in user.email
        assert user.first_name is not None
        assert user.last_name is not None
        assert user.is_active is True
        assert user.email_verified is True
        assert user.is_superuser is False
        assert user.deleted_at is None
        assert isinstance(user.created_at, datetime)
    
    def test_user_full_name_property(self):
        """Test the full_name property."""
        # Test with both first and last name
        user = UserFactory(first_name="John", last_name="Doe")
        assert user.full_name == "John Doe"
        
        # Test with only first name
        user = UserFactory(first_name="John", last_name=None)
        assert user.full_name == "John"
        
        # Test with only last name
        user = UserFactory(first_name=None, last_name="Doe")
        assert user.full_name == "Doe"
        
        # Test with neither (should return email prefix)
        user = UserFactory(first_name=None, last_name=None, email="john.doe@example.com")
        assert user.full_name == "john.doe"
    
    def test_user_is_deleted_property(self):
        """Test the is_deleted property."""
        # Test active user
        user = UserFactory(deleted_at=None)
        assert user.is_deleted is False
        
        # Test deleted user
        user = UserFactory(deleted_at=datetime.utcnow())
        assert user.is_deleted is True
    
    def test_user_repr(self):
        """Test the user string representation."""
        user = UserFactory(email="test@example.com")
        repr_str = repr(user)
        assert "User" in repr_str
        assert user.id in repr_str
        assert "test@example.com" in repr_str


class TestAddressModel:
    """Test the Address model."""
    
    def test_address_creation(self):
        """Test creating an address instance."""
        address = AddressFactory()
        
        assert address.id is not None
        assert address.user_id is not None
        assert address.address_type in ["billing", "shipping", "both"]
        assert address.first_name is not None
        assert address.last_name is not None
        assert address.address_line_1 is not None
        assert address.city is not None
        assert address.postal_code is not None
        assert address.country is not None
        assert address.is_default is False
        assert address.is_verified is False
        assert isinstance(address.created_at, datetime)
    
    def test_address_full_name_property(self):
        """Test the full_name property."""
        address = AddressFactory(first_name="John", last_name="Doe")
        assert address.full_name == "John Doe"
        
        # Test with extra spaces (full_name joins and strips outer whitespace)
        address = AddressFactory(first_name="  John  ", last_name="  Doe  ")
        assert address.full_name == "John     Doe"  # Strips outer whitespace
    
    def test_address_full_address_property(self):
        """Test the full_address property."""
        address = AddressFactory(
            address_line_1="123 Main St",
            address_line_2="Apt 4B",
            city="New York",
            state_province="NY",
            postal_code="10001",
            country="US"
        )
        
        expected = "123 Main St\nApt 4B\nNew York, NY 10001\nUS"
        assert address.full_address == expected
        
        # Test without address_line_2
        address = AddressFactory(
            address_line_1="123 Main St",
            address_line_2=None,
            city="New York",
            state_province="NY",
            postal_code="10001",
            country="US"
        )
        
        expected = "123 Main St\nNew York, NY 10001\nUS"
        assert address.full_address == expected
    
    def test_address_can_be_used_for_method(self):
        """Test the can_be_used_for method."""
        # Test BOTH type address
        address = AddressFactory(address_type=AddressType.BOTH)
        assert address.can_be_used_for(AddressType.BILLING) is True
        assert address.can_be_used_for(AddressType.SHIPPING) is True
        assert address.can_be_used_for(AddressType.BOTH) is True
        
        # Test BILLING type address
        address = AddressFactory(address_type=AddressType.BILLING)
        assert address.can_be_used_for(AddressType.BILLING) is True
        assert address.can_be_used_for(AddressType.SHIPPING) is False
        assert address.can_be_used_for(AddressType.BOTH) is False
        
        # Test SHIPPING type address
        address = AddressFactory(address_type=AddressType.SHIPPING)
        assert address.can_be_used_for(AddressType.BILLING) is False
        assert address.can_be_used_for(AddressType.SHIPPING) is True
        assert address.can_be_used_for(AddressType.BOTH) is False
    
    def test_address_type_enum(self):
        """Test the AddressType enum."""
        assert AddressType.BILLING.value == "billing"
        assert AddressType.SHIPPING.value == "shipping"
        assert AddressType.BOTH.value == "both"
        
        # Test enum comparison
        assert AddressType.BILLING == "billing"
        assert AddressType.SHIPPING == "shipping"
        assert AddressType.BOTH == "both"
    
    def test_address_repr(self):
        """Test the address string representation."""
        address = AddressFactory(city="New York")
        repr_str = repr(address)
        assert "Address" in repr_str
        assert address.id in repr_str
        assert "New York" in repr_str


class TestAuditLogModel:
    """Test the AuditLog model."""
    
    def test_audit_log_creation(self):
        """Test creating an audit log instance."""
        audit_log = AuditLogFactory()
        
        assert audit_log.id is not None
        assert audit_log.user_id is not None
        assert audit_log.action is not None
        assert audit_log.resource_type is not None
        assert audit_log.resource_id is not None
        assert isinstance(audit_log.timestamp, datetime)
        assert audit_log.ip_address is not None
        assert audit_log.user_agent is not None
    
    def test_audit_log_with_json_values(self):
        """Test audit log with JSON old_values and new_values."""
        old_values = {"email": "old@example.com", "name": "Old Name"}
        new_values = {"email": "new@example.com", "name": "New Name"}
        
        audit_log = AuditLogFactory(
            old_values=old_values,
            new_values=new_values
        )
        
        assert audit_log.old_values == old_values
        assert audit_log.new_values == new_values
    
    def test_audit_log_without_optional_fields(self):
        """Test audit log without optional fields."""
        audit_log = AuditLogFactory(
            old_values=None,
            new_values=None,
            ip_address=None,
            user_agent=None
        )
        
        assert audit_log.old_values is None
        assert audit_log.new_values is None
        assert audit_log.ip_address is None
        assert audit_log.user_agent is None
    
    def test_audit_log_repr(self):
        """Test the audit log string representation."""
        audit_log = AuditLogFactory(
            action="update_profile",
            resource_type="user"
        )
        
        repr_str = repr(audit_log)
        assert "AuditLog" in repr_str
        assert audit_log.id in repr_str
        assert "update_profile" in repr_str
        assert "user" in repr_str


class TestModelRelationships:
    """Test relationships between models."""
    
    def test_user_address_relationship(self):
        """Test the relationship between User and Address."""
        user = UserFactory()
        address1 = AddressFactory(user_id=user.id)
        address2 = AddressFactory(user_id=user.id)
        
        # Note: These relationships are tested at the ORM level in integration tests
        # Here we just verify the foreign key relationships are set correctly
        assert address1.user_id == user.id
        assert address2.user_id == user.id
    
    def test_user_audit_log_relationship(self):
        """Test the relationship between User and AuditLog."""
        user = UserFactory()
        audit_log = AuditLogFactory(user_id=user.id)
        
        assert audit_log.user_id == user.id


class TestModelValidation:
    """Test model validation and constraints."""
    
    def test_user_email_uniqueness_constraint(self):
        """Test that user email should be unique (tested at DB level)."""
        # This test would need a database session to test properly
        # We'll cover this in integration tests
        pass
    
    def test_address_type_validation(self):
        """Test address type validation."""
        # Valid address types
        valid_types = [AddressType.BILLING, AddressType.SHIPPING, AddressType.BOTH]
        
        for addr_type in valid_types:
            address = AddressFactory(address_type=addr_type)
            assert address.address_type == addr_type
    
    def test_country_code_format(self):
        """Test country code format."""
        # Should be 2-letter code
        address = AddressFactory(country="US")
        assert len(address.country) == 2
        assert address.country.isupper()


class TestModelMethods:
    """Test custom model methods."""
    
    def test_user_password_related_methods(self):
        """Test password-related functionality (handled by security module)."""
        # Password hashing is handled by the security module
        # We test the integration in the CRUD tests
        user = UserFactory()
        assert user.hashed_password is not None
        assert len(user.hashed_password) > 10  # Should be a hash
    
    def test_address_default_behavior(self):
        """Test address default setting behavior."""
        user = UserFactory()
        
        # Create multiple addresses
        address1 = AddressFactory(user_id=user.id, is_default=False)
        address2 = AddressFactory(user_id=user.id, is_default=True)
        address3 = AddressFactory(user_id=user.id, is_default=False)
        
        # Only one should be default (enforced at business logic level)
        assert address1.is_default is False
        assert address2.is_default is True
        assert address3.is_default is False