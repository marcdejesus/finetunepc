"""Integration tests for authentication API endpoints."""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from app.models import User
from tests.fixtures.factories import UserFactory


@pytest.mark.integration
@pytest.mark.auth
@pytest.mark.asyncio
class TestAuthenticationEndpoints:
    """Test authentication API endpoints."""
    
    @pytest.fixture
    def mock_email_service(self):
        """Mock email service for testing."""
        return AsyncMock()
    
    async def test_register_user_success(self, async_client: AsyncClient, db_session, mock_email_service):
        """Test successful user registration."""
        register_data = {
            "email": "newuser@example.com",
            "password": "TestPassword123!",
            "first_name": "New",
            "last_name": "User",
            "phone_number": "+1234567890"
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/register", json=register_data)
            
            assert response.status_code == 201
            response_data = response.json()
            
            assert "user_id" in response_data
            assert response_data["email"] == register_data["email"]
            assert response_data["verification_required"] is True
            
            # Verify user was created in database
            from sqlalchemy import select
            result = await db_session.execute(
                select(User).where(User.email == register_data["email"])
            )
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.email == register_data["email"]
            assert user.first_name == register_data["first_name"]
            assert user.email_verified is False
    
    async def test_register_user_duplicate_email(self, async_client: AsyncClient, db_session):
        """Test registration with duplicate email."""
        # Create existing user
        existing_user = UserFactory(email="existing@example.com")
        db_session.add(existing_user)
        await db_session.commit()
        
        register_data = {
            "email": "existing@example.com",
            "password": "TestPassword123!",
            "first_name": "Duplicate",
            "last_name": "User",
            "phone_number": "+1234567890"
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/register", json=register_data)
            
            assert response.status_code == 409
            response_data = response.json()
            assert "already exists" in response_data["detail"]
    
    async def test_register_user_invalid_password(self, async_client: AsyncClient):
        """Test registration with invalid password."""
        register_data = {
            "email": "test@example.com",
            "password": "weak",  # Too weak
            "first_name": "Test",
            "last_name": "User",
            "phone_number": "+1234567890"
        }
        
        response = await async_client.post("/auth/register", json=register_data)
        
        assert response.status_code == 422  # Validation error
    
    async def test_register_user_rate_limited(self, async_client: AsyncClient):
        """Test registration when rate limited."""
        register_data = {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "phone_number": "+1234567890"
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = False
            
            response = await async_client.post("/auth/register", json=register_data)
            
            assert response.status_code == 429
    
    async def test_login_user_success(self, async_client: AsyncClient, db_session):
        """Test successful user login."""
        # Create verified user
        user = UserFactory(email="logintest@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "logintest@example.com",
            "password": "TestPassword123!",  # This is the default password in UserFactory
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            response_data = response.json()
            
            assert "tokens" in response_data
            assert "access_token" in response_data["tokens"]
            assert "refresh_token" in response_data["tokens"]
            assert response_data["tokens"]["token_type"] == "bearer"
            
            assert "user" in response_data
            assert response_data["user"]["email"] == user.email
            assert response_data["user"]["first_name"] == user.first_name
    
    async def test_login_user_invalid_credentials(self, async_client: AsyncClient, db_session):
        """Test login with invalid credentials."""
        # Create user
        user = UserFactory(email="logintest@example.com")
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "logintest@example.com",
            "password": "WrongPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 401
            response_data = response.json()
            assert "Invalid email or password" in response_data["detail"]
    
    async def test_login_user_not_found(self, async_client: AsyncClient):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 401
            response_data = response.json()
            assert "Invalid email or password" in response_data["detail"]
    
    async def test_refresh_token_success(self, async_client: AsyncClient, auth_headers, db_session):
        """Test successful token refresh."""
        # First, get a refresh token by logging in
        user = UserFactory(email="refreshtest@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "refreshtest@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            login_response = await async_client.post("/auth/login", json=login_data)
            assert login_response.status_code == 200
            
            login_data_response = login_response.json()
            refresh_token = login_data_response["tokens"]["refresh_token"]
            
            # Now test token refresh
            refresh_data = {"refresh_token": refresh_token}
            response = await async_client.post("/auth/refresh", json=refresh_data)
            
            assert response.status_code == 200
            response_data = response.json()
            
            assert "access_token" in response_data
            assert "expires_in" in response_data
            assert response_data["access_token"] != login_data_response["tokens"]["access_token"]
    
    async def test_refresh_token_invalid(self, async_client: AsyncClient):
        """Test token refresh with invalid token."""
        refresh_data = {"refresh_token": "invalid.jwt.token"}
        
        response = await async_client.post("/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
        response_data = response.json()
        assert "Invalid refresh token" in response_data["detail"]
    
    async def test_verify_email_success(self, async_client: AsyncClient, db_session):
        """Test successful email verification."""
        # Create user with unverified email
        user = UserFactory(email="verify@example.com", email_verified=False)
        db_session.add(user)
        await db_session.commit()
        
        # Generate verification token
        from app.core.security import JWTManager
        verification_token = JWTManager.create_email_verification_token(
            user_id=user.id,
            email=user.email
        )
        
        verification_data = {"token": verification_token}
        response = await async_client.post("/auth/verify-email", json=verification_data)
        
        assert response.status_code == 200
        
        # Verify user email is now verified
        await db_session.refresh(user)
        assert user.email_verified is True
    
    async def test_verify_email_invalid_token(self, async_client: AsyncClient):
        """Test email verification with invalid token."""
        verification_data = {"token": "invalid.jwt.token"}
        
        response = await async_client.post("/auth/verify-email", json=verification_data)
        
        assert response.status_code == 400
        response_data = response.json()
        assert "Invalid verification token" in response_data["detail"]
    
    async def test_resend_verification_email(self, async_client: AsyncClient, db_session):
        """Test resending verification email."""
        # Create user with unverified email
        user = UserFactory(email="resend@example.com", email_verified=False)
        db_session.add(user)
        await db_session.commit()
        
        resend_data = {"email": "resend@example.com"}
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/resend-verification", json=resend_data)
            
            assert response.status_code == 200
            # Response should always be success to prevent email enumeration
    
    async def test_resend_verification_nonexistent_email(self, async_client: AsyncClient):
        """Test resending verification email for non-existent user."""
        resend_data = {"email": "nonexistent@example.com"}
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/resend-verification", json=resend_data)
            
            # Should still return success to prevent email enumeration
            assert response.status_code == 200
    
    async def test_password_reset_request(self, async_client: AsyncClient, db_session):
        """Test password reset request."""
        # Create user
        user = UserFactory(email="resettest@example.com")
        db_session.add(user)
        await db_session.commit()
        
        reset_data = {"email": "resettest@example.com"}
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/password-reset", json=reset_data)
            
            assert response.status_code == 200
            # Response should always be success to prevent email enumeration
    
    async def test_password_reset_confirm_success(self, async_client: AsyncClient, db_session):
        """Test successful password reset confirmation."""
        # Create user
        user = UserFactory(email="resetconfirm@example.com")
        db_session.add(user)
        await db_session.commit()
        
        # Generate reset token
        from app.core.security import JWTManager
        reset_token = JWTManager.create_password_reset_token(
            user_id=user.id,
            email=user.email
        )
        
        confirm_data = {
            "token": reset_token,
            "new_password": "NewPassword123!"
        }
        
        response = await async_client.post("/auth/password-reset/confirm", json=confirm_data)
        
        assert response.status_code == 200
        
        # Verify password was changed
        await db_session.refresh(user)
        from app.core.security import PasswordManager
        assert PasswordManager.verify_password("NewPassword123!", user.hashed_password)
    
    async def test_password_reset_confirm_invalid_token(self, async_client: AsyncClient):
        """Test password reset confirmation with invalid token."""
        confirm_data = {
            "token": "invalid.jwt.token",
            "new_password": "NewPassword123!"
        }
        
        response = await async_client.post("/auth/password-reset/confirm", json=confirm_data)
        
        assert response.status_code == 400
        response_data = response.json()
        assert "Invalid reset token" in response_data["detail"]
    
    async def test_change_password_success(self, async_client: AsyncClient, auth_headers, authenticated_user):
        """Test successful password change."""
        change_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!"
        }
        
        response = await async_client.post(
            "/auth/password/change", 
            json=change_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    async def test_change_password_wrong_current(self, async_client: AsyncClient, auth_headers):
        """Test password change with incorrect current password."""
        change_data = {
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword456!"
        }
        
        response = await async_client.post(
            "/auth/password/change", 
            json=change_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert "incorrect" in response_data["detail"]
    
    async def test_change_password_unauthenticated(self, async_client: AsyncClient):
        """Test password change without authentication."""
        change_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!"
        }
        
        response = await async_client.post("/auth/password/change", json=change_data)
        
        assert response.status_code == 401
    
    async def test_get_current_user_profile(self, async_client: AsyncClient, auth_headers, authenticated_user):
        """Test getting current user profile."""
        response = await async_client.get("/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        response_data = response.json()
        
        assert response_data["id"] == authenticated_user.id
        assert response_data["email"] == authenticated_user.email
        assert response_data["first_name"] == authenticated_user.first_name
        assert response_data["last_name"] == authenticated_user.last_name
    
    async def test_get_current_user_profile_unauthenticated(self, async_client: AsyncClient):
        """Test getting current user profile without authentication."""
        response = await async_client.get("/auth/me")
        
        assert response.status_code == 401
    
    async def test_update_user_profile(self, async_client: AsyncClient, auth_headers, authenticated_user):
        """Test updating user profile."""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone_number": "+9876543210"
        }
        
        response = await async_client.patch(
            "/auth/me", 
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        response_data = response.json()
        
        assert response_data["user"]["first_name"] == "Updated"
        assert response_data["user"]["last_name"] == "Name"
        assert response_data["user"]["phone_number"] == "+9876543210"
    
    async def test_get_user_sessions(self, async_client: AsyncClient, auth_headers):
        """Test getting user sessions."""
        response = await async_client.get("/auth/sessions", headers=auth_headers)
        
        assert response.status_code == 200
        response_data = response.json()
        
        assert "sessions" in response_data
        assert "total" in response_data
        assert response_data["total"] >= 1  # At least current session
        
        # Current session should be marked
        current_session = next(
            (s for s in response_data["sessions"] if s["is_current"]), 
            None
        )
        assert current_session is not None
    
    async def test_logout_user(self, async_client: AsyncClient, auth_headers):
        """Test user logout."""
        logout_data = {"revoke_all_sessions": False}
        
        response = await async_client.post(
            "/auth/logout", 
            json=logout_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Try to access protected endpoint with same token (should fail)
        profile_response = await async_client.get("/auth/me", headers=auth_headers)
        assert profile_response.status_code == 401
    
    async def test_logout_all_sessions(self, async_client: AsyncClient, auth_headers):
        """Test logging out all sessions."""
        logout_data = {"revoke_all_sessions": True}
        
        response = await async_client.post(
            "/auth/logout", 
            json=logout_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    async def test_auth_health_check(self, async_client: AsyncClient):
        """Test authentication service health check."""
        response = await async_client.get("/auth/health")
        
        assert response.status_code == 200
        response_data = response.json()
        
        assert response_data["status"] == "healthy"
        assert response_data["service"] == "authentication"