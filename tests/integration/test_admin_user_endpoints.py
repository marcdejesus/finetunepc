"""Integration tests for admin user management endpoints."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.user import User
from tests.fixtures.factories import UserFactory, SuperuserFactory


class TestAdminUserEndpoints:
    """Test admin user management endpoints."""
    
    @pytest.fixture
    async def admin_user(self, db_session):
        """Create an admin user for testing."""
        admin = SuperuserFactory()
        db_session.add(admin)
        await db_session.commit()
        await db_session.refresh(admin)
        return admin
    
    @pytest.fixture
    async def admin_auth_headers(self, admin_user, db_session):
        """Create authentication headers for admin user."""
        from app.services.auth_service import AuthenticationService
        from app.schemas.auth import UserLoginRequest, DeviceInfo
        
        auth_service = AuthenticationService(db_session)
        login_data = UserLoginRequest(
            email=admin_user.email,
            password="TestPassword123!",
            remember_me=False
        )
        device_info = DeviceInfo(ip_address="127.0.0.1", user_agent="test-agent")
        
        _, tokens, _ = await auth_service.authenticate_user(login_data, device_info)
        
        return {"Authorization": f"Bearer {tokens.access_token}"}
    
    @pytest.fixture
    async def regular_user(self, db_session):
        """Create a regular user for testing."""
        user = UserFactory()
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest.mark.asyncio
    async def test_list_users_admin(self, async_client: AsyncClient, admin_user: User, admin_auth_headers: dict, db_session):
        """Test listing users as admin."""
        # Create additional test users
        users = [UserFactory() for _ in range(3)]
        db_session.add_all(users)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/users/", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 4  # Admin + 3 test users

    @pytest.mark.asyncio
    async def test_list_users_with_pagination(self, async_client: AsyncClient, admin_auth_headers: dict, db_session):
        """Test listing users with pagination."""
        # Create test users
        users = [UserFactory() for _ in range(5)]
        db_session.add_all(users)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/users/?skip=0&limit=2", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_users_regular_user_forbidden(self, async_client: AsyncClient, auth_headers: dict):
        """Test that regular users cannot list all users."""
        response = await async_client.get("/api/v1/users/", headers=auth_headers)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_list_users_unauthenticated(self, async_client: AsyncClient):
        """Test listing users without authentication."""
        response = await async_client.get("/api/v1/users/")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_user_by_id_admin(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User):
        """Test getting user by ID as admin."""
        response = await async_client.get(f"/api/v1/users/{regular_user.id}", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == regular_user.id
        assert data["email"] == regular_user.email
        assert data["first_name"] == regular_user.first_name
        assert data["last_name"] == regular_user.last_name

    @pytest.mark.asyncio
    async def test_get_user_by_id_own_profile(self, async_client: AsyncClient, authenticated_user: User, auth_headers: dict):
        """Test getting own profile by ID."""
        response = await async_client.get(f"/api/v1/users/{authenticated_user.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == authenticated_user.id
        assert data["email"] == authenticated_user.email

    @pytest.mark.asyncio
    async def test_get_user_by_id_other_user_forbidden(self, async_client: AsyncClient, auth_headers: dict, regular_user: User):
        """Test that regular users cannot access other users' profiles."""
        response = await async_client.get(f"/api/v1/users/{regular_user.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, async_client: AsyncClient, admin_auth_headers: dict):
        """Test getting user by non-existent ID."""
        response = await async_client.get("/api/v1/users/nonexistent-id", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_user_admin(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User, db_session):
        """Test soft deleting user as admin."""
        response = await async_client.delete(f"/api/v1/users/{regular_user.id}", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User deleted successfully"
        
        # Verify user was soft deleted
        await db_session.refresh(regular_user)
        assert regular_user.deleted_at is not None
        assert regular_user.is_active is False

    @pytest.mark.asyncio
    async def test_delete_user_regular_user_forbidden(self, async_client: AsyncClient, auth_headers: dict, regular_user: User):
        """Test that regular users cannot delete other users."""
        response = await async_client.delete(f"/api/v1/users/{regular_user.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, async_client: AsyncClient, admin_auth_headers: dict):
        """Test deleting non-existent user."""
        response = await async_client.delete("/api/v1/users/nonexistent-id", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_delete_already_deleted_user(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User, db_session):
        """Test deleting already deleted user."""
        # Soft delete the user first
        from datetime import datetime
        regular_user.deleted_at = datetime.utcnow()
        regular_user.is_active = False
        await db_session.commit()
        
        response = await async_client.delete(f"/api/v1/users/{regular_user.id}", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_activate_user_admin(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User, db_session):
        """Test activating user as admin."""
        # Deactivate user first
        regular_user.is_active = False
        await db_session.commit()
        
        response = await async_client.post(f"/api/v1/users/{regular_user.id}/activate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User activated successfully"
        
        # Verify user was activated
        await db_session.refresh(regular_user)
        assert regular_user.is_active is True

    @pytest.mark.asyncio
    async def test_activate_user_regular_user_forbidden(self, async_client: AsyncClient, auth_headers: dict, regular_user: User):
        """Test that regular users cannot activate other users."""
        response = await async_client.post(f"/api/v1/users/{regular_user.id}/activate", headers=auth_headers)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_activate_user_not_found(self, async_client: AsyncClient, admin_auth_headers: dict):
        """Test activating non-existent user."""
        response = await async_client.post("/api/v1/users/nonexistent-id/activate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_activate_soft_deleted_user(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User, db_session):
        """Test activating soft deleted user clears deletion."""
        # Soft delete the user first
        from datetime import datetime
        regular_user.deleted_at = datetime.utcnow()
        regular_user.is_active = False
        await db_session.commit()
        
        response = await async_client.post(f"/api/v1/users/{regular_user.id}/activate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify user was activated and deletion cleared
        await db_session.refresh(regular_user)
        assert regular_user.is_active is True
        assert regular_user.deleted_at is None

    @pytest.mark.asyncio
    async def test_deactivate_user_admin(self, async_client: AsyncClient, admin_auth_headers: dict, regular_user: User, db_session):
        """Test deactivating user as admin."""
        response = await async_client.post(f"/api/v1/users/{regular_user.id}/deactivate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User deactivated successfully"
        
        # Verify user was deactivated
        await db_session.refresh(regular_user)
        assert regular_user.is_active is False

    @pytest.mark.asyncio
    async def test_deactivate_user_regular_user_forbidden(self, async_client: AsyncClient, auth_headers: dict, regular_user: User):
        """Test that regular users cannot deactivate other users."""
        response = await async_client.post(f"/api/v1/users/{regular_user.id}/deactivate", headers=auth_headers)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_deactivate_user_not_found(self, async_client: AsyncClient, admin_auth_headers: dict):
        """Test deactivating non-existent user."""
        response = await async_client.post("/api/v1/users/nonexistent-id/deactivate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_admin_cannot_deactivate_self(self, async_client: AsyncClient, admin_user: User, admin_auth_headers: dict):
        """Test that admin cannot deactivate their own account."""
        response = await async_client.post(f"/api/v1/users/{admin_user.id}/deactivate", headers=admin_auth_headers)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "Cannot deactivate your own account" in data["detail"]

    @pytest.mark.asyncio
    async def test_admin_endpoints_unauthenticated(self, async_client: AsyncClient, regular_user: User):
        """Test admin endpoints without authentication."""
        endpoints = [
            ("DELETE", f"/api/v1/users/{regular_user.id}"),
            ("POST", f"/api/v1/users/{regular_user.id}/activate"),
            ("POST", f"/api/v1/users/{regular_user.id}/deactivate")
        ]
        
        for method, url in endpoints:
            if method == "DELETE":
                response = await async_client.delete(url)
            elif method == "POST":
                response = await async_client.post(url)
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAdminUserManagementFlow:
    """Test complete admin user management flows."""
    
    @pytest.fixture
    async def admin_user(self, db_session):
        """Create an admin user for testing."""
        admin = SuperuserFactory()
        db_session.add(admin)
        await db_session.commit()
        await db_session.refresh(admin)
        return admin
    
    @pytest.fixture
    async def admin_auth_headers(self, admin_user, db_session):
        """Create authentication headers for admin user."""
        from app.services.auth_service import AuthenticationService
        from app.schemas.auth import UserLoginRequest, DeviceInfo
        
        auth_service = AuthenticationService(db_session)
        login_data = UserLoginRequest(
            email=admin_user.email,
            password="TestPassword123!",
            remember_me=False
        )
        device_info = DeviceInfo(ip_address="127.0.0.1", user_agent="test-agent")
        
        _, tokens, _ = await auth_service.authenticate_user(login_data, device_info)
        
        return {"Authorization": f"Bearer {tokens.access_token}"}

    @pytest.mark.asyncio
    async def test_complete_user_lifecycle_management(self, async_client: AsyncClient, admin_auth_headers: dict, db_session):
        """Test complete user lifecycle: create, list, get, deactivate, activate, delete."""
        # Create test user
        test_user = UserFactory()
        db_session.add(test_user)
        await db_session.commit()
        
        # 1. List users (should include our test user)
        response = await async_client.get("/api/v1/users/", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        users = response.json()
        user_ids = [user["id"] for user in users]
        assert test_user.id in user_ids
        
        # 2. Get specific user
        response = await async_client.get(f"/api/v1/users/{test_user.id}", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        user_data = response.json()
        assert user_data["id"] == test_user.id
        assert user_data["is_active"] is True
        
        # 3. Deactivate user
        response = await async_client.post(f"/api/v1/users/{test_user.id}/deactivate", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify user is deactivated
        response = await async_client.get(f"/api/v1/users/{test_user.id}", headers=admin_auth_headers)
        user_data = response.json()
        assert user_data["is_active"] is False
        
        # 4. Activate user again
        response = await async_client.post(f"/api/v1/users/{test_user.id}/activate", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify user is activated
        response = await async_client.get(f"/api/v1/users/{test_user.id}", headers=admin_auth_headers)
        user_data = response.json()
        assert user_data["is_active"] is True
        
        # 5. Soft delete user
        response = await async_client.delete(f"/api/v1/users/{test_user.id}", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify user appears to be deleted (404 when trying to access)
        response = await async_client.get(f"/api/v1/users/{test_user.id}", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_bulk_user_operations(self, async_client: AsyncClient, admin_auth_headers: dict, db_session):
        """Test operations on multiple users."""
        # Create multiple test users
        test_users = [UserFactory() for _ in range(3)]
        db_session.add_all(test_users)
        await db_session.commit()
        
        # Deactivate all test users
        for user in test_users:
            response = await async_client.post(f"/api/v1/users/{user.id}/deactivate", headers=admin_auth_headers)
            assert response.status_code == status.HTTP_200_OK
        
        # Verify all users are deactivated
        for user in test_users:
            response = await async_client.get(f"/api/v1/users/{user.id}", headers=admin_auth_headers)
            user_data = response.json()
            assert user_data["is_active"] is False
        
        # Reactivate all users
        for user in test_users:
            response = await async_client.post(f"/api/v1/users/{user.id}/activate", headers=admin_auth_headers)
            assert response.status_code == status.HTTP_200_OK
        
        # Verify all users are activated
        for user in test_users:
            response = await async_client.get(f"/api/v1/users/{user.id}", headers=admin_auth_headers)
            user_data = response.json()
            assert user_data["is_active"] is True

    @pytest.mark.asyncio
    async def test_admin_permission_separation(self, async_client: AsyncClient, admin_auth_headers: dict, auth_headers: dict, db_session):
        """Test that admin and regular user permissions are properly separated."""
        # Create test user
        test_user = UserFactory()
        db_session.add(test_user)
        await db_session.commit()
        
        # Admin can access all operations
        admin_operations = [
            ("GET", f"/api/v1/users/{test_user.id}"),
            ("POST", f"/api/v1/users/{test_user.id}/deactivate"),
            ("POST", f"/api/v1/users/{test_user.id}/activate"),
            ("DELETE", f"/api/v1/users/{test_user.id}")
        ]
        
        for method, url in admin_operations[:-1]:  # Skip delete for now
            if method == "GET":
                response = await async_client.get(url, headers=admin_auth_headers)
            elif method == "POST":
                response = await async_client.post(url, headers=admin_auth_headers)
            
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        
        # Regular user cannot access admin operations
        restricted_operations = [
            ("GET", "/api/v1/users/"),  # List all users
            ("POST", f"/api/v1/users/{test_user.id}/deactivate"),
            ("POST", f"/api/v1/users/{test_user.id}/activate"),
            ("DELETE", f"/api/v1/users/{test_user.id}")
        ]
        
        for method, url in restricted_operations:
            if method == "GET":
                response = await async_client.get(url, headers=auth_headers)
            elif method == "POST":
                response = await async_client.post(url, headers=auth_headers)
            elif method == "DELETE":
                response = await async_client.delete(url, headers=auth_headers)
            
            assert response.status_code == status.HTTP_403_FORBIDDEN