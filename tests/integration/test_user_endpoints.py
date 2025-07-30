"""Integration tests for user management endpoints."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.user import User
from app.models.address import Address, AddressType
from app.schemas.user import UserCreate, UserUpdate, UserPasswordChange
from tests.fixtures.factories import UserFactory, AddressFactory


class TestUserProfileEndpoints:
    """Test user profile management endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_profile(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test getting current user profile."""
        response = await async_client.get("/api/v1/users/profile", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == authenticated_user.id
        assert data["email"] == authenticated_user.email
        assert data["first_name"] == authenticated_user.first_name
        assert data["last_name"] == authenticated_user.last_name
        assert data["phone_number"] == authenticated_user.phone_number
        assert data["email_verified"] == authenticated_user.email_verified
        assert data["is_active"] == authenticated_user.is_active
        assert "full_name" in data
        assert "created_at" in data
        assert "hashed_password" not in data  # Should not expose sensitive data

    @pytest.mark.asyncio
    async def test_get_current_user_profile_unauthenticated(self, async_client: AsyncClient):
        """Test getting current user profile without authentication."""
        response = await async_client.get("/api/v1/users/profile")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_update_current_user_profile(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test updating current user profile."""
        update_data = {
            "first_name": "UpdatedFirst",
            "last_name": "UpdatedLast",
            "phone_number": "+9876543210"
        }
        
        response = await async_client.put("/api/v1/users/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == update_data["last_name"]
        assert data["phone_number"] == update_data["phone_number"]
        assert data["email"] == authenticated_user.email  # Should not change

    @pytest.mark.asyncio
    async def test_update_current_user_profile_partial(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test updating current user profile with partial data."""
        update_data = {
            "first_name": "PartialUpdate"
        }
        
        response = await async_client.put("/api/v1/users/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == authenticated_user.last_name  # Should remain unchanged
        assert data["phone_number"] == authenticated_user.phone_number  # Should remain unchanged

    @pytest.mark.asyncio
    async def test_update_current_user_profile_invalid_data(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating current user profile with invalid data."""
        update_data = {
            "first_name": "A" * 150,  # Too long
            "phone_number": "invalid_phone"
        }
        
        response = await async_client.put("/api/v1/users/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_current_user_profile_forbidden_fields(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating current user profile with forbidden fields."""
        update_data = {
            "email": "newemail@example.com",  # Should be forbidden
            "is_active": False,  # Should be forbidden
            "first_name": "AllowedUpdate"
        }
        
        response = await async_client.put("/api/v1/users/profile", json=update_data, headers=auth_headers)
        
        # Should reject due to extra fields not allowed
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_current_user_profile_unauthenticated(self, async_client: AsyncClient):
        """Test updating current user profile without authentication."""
        update_data = {"first_name": "Test"}
        
        response = await async_client.put("/api/v1/users/profile", json=update_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPasswordChangeEndpoints:
    """Test password change endpoints."""
    
    @pytest.mark.asyncio
    async def test_change_password_success(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test successful password change."""
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!"
        }
        
        response = await async_client.post("/api/v1/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Password changed successfully"

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_password(self, async_client: AsyncClient, auth_headers: dict):
        """Test password change with wrong current password."""
        password_data = {
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!"
        }
        
        response = await async_client.post("/api/v1/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "Current password is incorrect" in data["detail"]

    @pytest.mark.asyncio
    async def test_change_password_weak_password(self, async_client: AsyncClient, auth_headers: dict):
        """Test password change with weak new password."""
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "weak",
            "confirm_password": "weak"
        }
        
        response = await async_client.post("/api/v1/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_change_password_mismatch(self, async_client: AsyncClient, auth_headers: dict):
        """Test password change with mismatched passwords."""
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "DifferentPassword123!"
        }
        
        response = await async_client.post("/api/v1/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_change_password_unauthenticated(self, async_client: AsyncClient):
        """Test password change without authentication."""
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!"
        }
        
        response = await async_client.post("/api/v1/users/change-password", json=password_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAddressEndpoints:
    """Test address management endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_addresses(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test getting user addresses."""
        # Create test addresses
        address1 = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.SHIPPING)
        address2 = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.BILLING)
        db_session.add_all([address1, address2])
        await db_session.commit()
        
        response = await async_client.get("/api/v1/users/addresses", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "addresses" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data
        assert data["total"] == 2
        assert len(data["addresses"]) == 2

    @pytest.mark.asyncio
    async def test_get_user_addresses_with_pagination(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test getting user addresses with pagination."""
        # Create multiple test addresses
        addresses = [AddressFactory(user_id=authenticated_user.id) for _ in range(5)]
        db_session.add_all(addresses)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/users/addresses?page=1&size=2", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["size"] == 2
        assert data["pages"] == 3
        assert len(data["addresses"]) == 2

    @pytest.mark.asyncio
    async def test_get_user_addresses_with_type_filter(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test getting user addresses with type filter."""
        # Create addresses of different types
        shipping_addr = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.SHIPPING)
        billing_addr = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.BILLING)
        db_session.add_all([shipping_addr, billing_addr])
        await db_session.commit()
        
        response = await async_client.get("/api/v1/users/addresses?address_type=shipping", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should only return shipping addresses (or addresses that can be used for shipping)
        assert len(data["addresses"]) >= 1
        for addr in data["addresses"]:
            assert addr["address_type"] in ["shipping", "both"]

    @pytest.mark.asyncio
    async def test_create_user_address(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test creating a new address."""
        address_data = {
            "address_type": "shipping",
            "first_name": "John",
            "last_name": "Doe",
            "company": "Test Company",
            "address_line_1": "123 Main St",
            "address_line_2": "Apt 4B",
            "city": "New York",
            "state_province": "NY",
            "postal_code": "10001",
            "country": "US",
            "phone_number": "+1234567890"
        }
        
        response = await async_client.post("/api/v1/users/addresses", json=address_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["first_name"] == address_data["first_name"]
        assert data["last_name"] == address_data["last_name"]
        assert data["address_line_1"] == address_data["address_line_1"]
        assert data["city"] == address_data["city"]
        assert data["country"] == address_data["country"]
        assert data["is_default"] is False
        assert "id" in data
        assert "full_name" in data
        assert "full_address" in data

    @pytest.mark.asyncio
    async def test_create_user_address_invalid_data(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating address with invalid data."""
        address_data = {
            "address_type": "invalid_type",
            "first_name": "",  # Required field
            "country": "USA"  # Should be 2-letter code
        }
        
        response = await async_client.post("/api/v1/users/addresses", json=address_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_update_user_address(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test updating a user address."""
        # Create test address
        address = AddressFactory(user_id=authenticated_user.id, first_name="Original")
        db_session.add(address)
        await db_session.commit()
        
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "city": "Boston"
        }
        
        response = await async_client.put(f"/api/v1/users/addresses/{address.id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == update_data["last_name"]
        assert data["city"] == update_data["city"]

    @pytest.mark.asyncio
    async def test_update_user_address_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating a non-existent address."""
        update_data = {"first_name": "Updated"}
        
        response = await async_client.put("/api/v1/users/addresses/nonexistent", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_update_other_user_address(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test updating address belonging to another user."""
        # Create address for different user
        other_user = UserFactory()
        db_session.add(other_user)
        await db_session.commit()
        
        other_address = AddressFactory(user_id=other_user.id)
        db_session.add(other_address)
        await db_session.commit()
        
        update_data = {"first_name": "Hacker"}
        
        response = await async_client.put(f"/api/v1/users/addresses/{other_address.id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_user_address(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test deleting a user address."""
        # Create test address
        address = AddressFactory(user_id=authenticated_user.id)
        db_session.add(address)
        await db_session.commit()
        
        response = await async_client.delete(f"/api/v1/users/addresses/{address.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Address deleted successfully"

    @pytest.mark.asyncio
    async def test_delete_user_address_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test deleting a non-existent address."""
        response = await async_client.delete("/api/v1/users/addresses/nonexistent", headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_set_default_address(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test setting an address as default."""
        # Create test address
        address = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.SHIPPING, is_default=False)
        db_session.add(address)
        await db_session.commit()
        
        response = await async_client.post(f"/api/v1/users/addresses/{address.id}/set-default", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_default"] is True

    @pytest.mark.asyncio
    async def test_set_default_address_with_type(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test setting an address as default for specific type."""
        # Create address that can be used for both
        address = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.BOTH, is_default=False)
        db_session.add(address)
        await db_session.commit()
        
        response = await async_client.post(f"/api/v1/users/addresses/{address.id}/set-default?address_type=billing", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_default"] is True

    @pytest.mark.asyncio
    async def test_set_default_address_incompatible_type(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict, db_session):
        """Test setting address as default for incompatible type."""
        # Create shipping-only address
        address = AddressFactory(user_id=authenticated_user.id, address_type=AddressType.SHIPPING)
        db_session.add(address)
        await db_session.commit()
        
        response = await async_client.post(f"/api/v1/users/addresses/{address.id}/set-default?address_type=billing", headers=auth_headers)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_set_default_address_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test setting default for non-existent address."""
        response = await async_client.post("/api/v1/users/addresses/nonexistent/set-default", headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_address_endpoints_unauthenticated(self, async_client: AsyncClient):
        """Test address endpoints without authentication."""
        # Test all address endpoints without auth
        endpoints = [
            ("GET", "/api/v1/users/addresses"),
            ("POST", "/api/v1/users/addresses"),
            ("PUT", "/api/v1/users/addresses/test"),
            ("DELETE", "/api/v1/users/addresses/test"),
            ("POST", "/api/v1/users/addresses/test/set-default")
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = await async_client.get(url)
            elif method == "POST":
                response = await async_client.post(url, json={})
            elif method == "PUT":
                response = await async_client.put(url, json={})
            elif method == "DELETE":
                response = await async_client.delete(url)
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED