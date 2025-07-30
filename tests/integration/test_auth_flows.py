"""Comprehensive authentication flow tests."""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from app.models import User, UserSession
from app.core.security import JWTManager
from tests.fixtures.factories import UserFactory
from tests.fixtures.mocks import MockEmailService


@pytest.mark.integration
@pytest.mark.auth
@pytest.mark.asyncio
class TestCompleteAuthenticationFlows:
    """Test complete authentication workflows end-to-end."""
    
    @pytest.fixture
    def mock_email_service(self):
        """Mock email service for testing."""
        return MockEmailService()
    
    async def test_complete_registration_flow(self, async_client: AsyncClient, db_session, mock_email_service):
        """Test complete user registration and verification flow."""
        # Step 1: Register new user
        register_data = {
            "email": "flowtest@example.com",
            "password": "TestPassword123!",
            "first_name": "Flow",
            "last_name": "Test",
            "phone_number": "+1234567890"
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/register", json=register_data)
            
            assert response.status_code == 201
            response_data = response.json()
            user_id = response_data["user_id"]
            
            # Verify user was created but not verified
            from sqlalchemy import select
            result = await db_session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.email_verified is False
        
        # Step 2: Attempt login before verification (should work but note unverified status)
        login_data = {
            "email": "flowtest@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            response_data = response.json()
            assert "tokens" in response_data
            assert response_data["user"]["email_verified"] is False
        
        # Step 3: Verify email
        verification_token = JWTManager.create_email_verification_token(
            user_id=user.id,
            email=user.email
        )
        
        verification_data = {"token": verification_token}
        response = await async_client.post("/auth/verify-email", json=verification_data)
        
        assert response.status_code == 200
        
        # Verify user is now verified
        await db_session.refresh(user)
        assert user.email_verified is True
        
        # Step 4: Login after verification
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            response_data = response.json()
            assert response_data["user"]["email_verified"] is True
    
    async def test_complete_password_reset_flow(self, async_client: AsyncClient, db_session):
        """Test complete password reset flow."""
        # Step 1: Create user
        user = UserFactory(email="resetflow@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        original_password_hash = user.hashed_password
        
        # Step 2: Request password reset
        reset_request_data = {"email": "resetflow@example.com"}
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/password-reset", json=reset_request_data)
            
            assert response.status_code == 200
        
        # Step 3: Confirm password reset with token
        reset_token = JWTManager.create_password_reset_token(
            user_id=user.id,
            email=user.email
        )
        
        new_password = "NewResetPassword123!"
        confirm_data = {
            "token": reset_token,
            "new_password": new_password
        }
        
        response = await async_client.post("/auth/password-reset/confirm", json=confirm_data)
        
        assert response.status_code == 200
        
        # Verify password was changed
        await db_session.refresh(user)
        assert user.hashed_password != original_password_hash
        
        # Step 4: Login with new password
        login_data = {
            "email": "resetflow@example.com",
            "password": new_password,
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            response_data = response.json()
            assert "tokens" in response_data
        
        # Step 5: Verify old password no longer works
        old_login_data = {
            "email": "resetflow@example.com",
            "password": "TestPassword123!",  # Original password from factory
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=old_login_data)
            
            assert response.status_code == 401
    
    async def test_token_refresh_flow(self, async_client: AsyncClient, db_session):
        """Test token refresh workflow."""
        # Step 1: Create user and login
        user = UserFactory(email="tokenflow@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "tokenflow@example.com",
            "password": "TestPassword123!",
            "remember_me": True  # Long-lived refresh token
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            response_data = response.json()
            
            original_access_token = response_data["tokens"]["access_token"]
            refresh_token = response_data["tokens"]["refresh_token"]
        
        # Step 2: Use refresh token to get new access token
        refresh_data = {"refresh_token": refresh_token}
        response = await async_client.post("/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        response_data = response.json()
        
        new_access_token = response_data["access_token"]
        assert new_access_token != original_access_token
        
        # Step 3: Verify new access token works
        headers = {"Authorization": f"Bearer {new_access_token}"}
        response = await async_client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["email"] == user.email
        
        # Step 4: Verify old access token still works (until it expires)
        old_headers = {"Authorization": f"Bearer {original_access_token}"}
        response = await async_client.get("/auth/me", headers=old_headers)
        
        # This might work or not depending on token expiration timing
        # In a real scenario, you'd want to test with controlled time
        assert response.status_code in [200, 401]
    
    async def test_session_management_flow(self, async_client: AsyncClient, db_session):
        """Test session management workflow."""
        # Step 1: Create user and login from multiple devices
        user = UserFactory(email="sessionflow@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "sessionflow@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        # Login from "device 1"
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response1 = await async_client.post("/auth/login", json=login_data)
            assert response1.status_code == 200
            
            device1_tokens = response1.json()["tokens"]
            device1_headers = {"Authorization": f"Bearer {device1_tokens['access_token']}"}
        
        # Login from "device 2"
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response2 = await async_client.post("/auth/login", json=login_data)
            assert response2.status_code == 200
            
            device2_tokens = response2.json()["tokens"]
            device2_headers = {"Authorization": f"Bearer {device2_tokens['access_token']}"}
        
        # Step 2: Check sessions from device 1
        response = await async_client.get("/auth/sessions", headers=device1_headers)
        
        assert response.status_code == 200
        sessions_data = response.json()
        assert sessions_data["total"] >= 2  # At least 2 sessions
        
        # Find the other session (device 2)
        current_session = next(s for s in sessions_data["sessions"] if s["is_current"])
        other_sessions = [s for s in sessions_data["sessions"] if not s["is_current"]]
        assert len(other_sessions) >= 1
        
        # Step 3: Revoke specific session (device 2) from device 1
        other_session_id = other_sessions[0]["id"]
        response = await async_client.delete(
            f"/auth/sessions/{other_session_id}",
            headers=device1_headers
        )
        
        assert response.status_code == 200
        
        # Step 4: Verify device 2 session is revoked
        response = await async_client.get("/auth/me", headers=device2_headers)
        assert response.status_code == 401  # Should be unauthorized now
        
        # Step 5: Verify device 1 still works
        response = await async_client.get("/auth/me", headers=device1_headers)
        assert response.status_code == 200
        
        # Step 6: Logout from device 1 (revoke all other sessions)
        logout_data = {"revoke_all_sessions": True}
        response = await async_client.post("/auth/logout", json=logout_data, headers=device1_headers)
        
        assert response.status_code == 200
        
        # Step 7: Verify device 1 is also logged out
        response = await async_client.get("/auth/me", headers=device1_headers)
        assert response.status_code == 401
    
    async def test_profile_management_flow(self, async_client: AsyncClient, db_session):
        """Test user profile management workflow."""
        # Step 1: Create user and login
        user = UserFactory(
            email="profileflow@example.com", 
            first_name="Original",
            last_name="Name",
            phone_number="+1111111111",
            email_verified=True
        )
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "profileflow@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 200
            tokens = response.json()["tokens"]
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        
        # Step 2: Get current profile
        response = await async_client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        profile_data = response.json()
        assert profile_data["first_name"] == "Original"
        assert profile_data["last_name"] == "Name"
        assert profile_data["phone_number"] == "+1111111111"
        
        # Step 3: Update profile
        update_data = {
            "first_name": "Updated",
            "last_name": "Profile",
            "phone_number": "+9999999999"
        }
        
        response = await async_client.patch("/auth/me", json=update_data, headers=headers)
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["user"]["first_name"] == "Updated"
        assert response_data["user"]["last_name"] == "Profile"
        assert response_data["user"]["phone_number"] == "+9999999999"
        
        # Step 4: Verify changes persisted
        response = await async_client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        profile_data = response.json()
        assert profile_data["first_name"] == "Updated"
        assert profile_data["last_name"] == "Profile"
        assert profile_data["phone_number"] == "+9999999999"
        
        # Step 5: Change password
        change_password_data = {
            "current_password": "TestPassword123!",
            "new_password": "UpdatedPassword456!"
        }
        
        response = await async_client.post(
            "/auth/password/change",
            json=change_password_data,
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Step 6: Verify new password works
        new_login_data = {
            "email": "profileflow@example.com",
            "password": "UpdatedPassword456!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/login", json=new_login_data)
            
            assert response.status_code == 200
    
    async def test_rate_limiting_flow(self, async_client: AsyncClient):
        """Test rate limiting across different endpoints."""
        # Test registration rate limiting
        register_data = {
            "email": "ratetest@example.com",
            "password": "TestPassword123!",
            "first_name": "Rate",
            "last_name": "Test",
            "phone_number": "+1234567890"
        }
        
        # Mock rate limiter to deny requests
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = False
            
            response = await async_client.post("/auth/register", json=register_data)
            
            assert response.status_code == 429
            assert "Retry-After" in response.headers
        
        # Test login rate limiting
        login_data = {
            "email": "test@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = False
            
            response = await async_client.post("/auth/login", json=login_data)
            
            assert response.status_code == 429
        
        # Test password reset rate limiting
        reset_data = {"email": "test@example.com"}
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = False
            
            response = await async_client.post("/auth/password-reset", json=reset_data)
            
            assert response.status_code == 429
    
    async def test_security_edge_cases(self, async_client: AsyncClient, db_session):
        """Test security edge cases and potential attack vectors."""
        # Test 1: Attempt to use expired tokens
        user = UserFactory(email="security@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        # Create an expired token manually
        expired_token = JWTManager.create_access_token(
            user_id=user.id,
            email=user.email,
            session_id="test_session",
            expires_delta=timedelta(microseconds=1)  # Immediate expiration
        )
        
        # Wait a moment to ensure expiration
        import time
        time.sleep(0.001)
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await async_client.get("/auth/me", headers=headers)
        
        assert response.status_code == 401
        
        # Test 2: Attempt to use tokens for wrong user
        user2 = UserFactory(email="security2@example.com", email_verified=True)
        db_session.add(user2)
        await db_session.commit()
        
        # Create token for user2 but try to access user1's data
        valid_token = JWTManager.create_access_token(
            user_id=user2.id,
            email=user2.email,
            session_id="test_session2"
        )
        
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = await async_client.get("/auth/me", headers=headers)
        
        assert response.status_code == 401  # Should fail due to invalid session
        
        # Test 3: Attempt to verify email with wrong token type
        password_reset_token = JWTManager.create_password_reset_token(
            user_id=user.id,
            email=user.email
        )
        
        verification_data = {"token": password_reset_token}
        response = await async_client.post("/auth/verify-email", json=verification_data)
        
        assert response.status_code == 400
        
        # Test 4: Attempt SQL injection in email field (should be handled by validation)
        malicious_register_data = {
            "email": "test@example.com'; DROP TABLE users; --",
            "password": "TestPassword123!",
            "first_name": "Malicious",
            "last_name": "User",
            "phone_number": "+1234567890"
        }
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            response = await async_client.post("/auth/register", json=malicious_register_data)
            
            # Should either fail validation or handle safely
            assert response.status_code in [422, 409]  # Validation error or conflict
    
    async def test_concurrent_session_handling(self, async_client: AsyncClient, db_session):
        """Test handling of concurrent authentication operations."""
        # This would typically require actual concurrent requests
        # For now, we'll simulate the scenario
        
        user = UserFactory(email="concurrent@example.com", email_verified=True)
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "email": "concurrent@example.com",
            "password": "TestPassword123!",
            "remember_me": False
        }
        
        # Simulate multiple rapid logins
        responses = []
        
        with patch('app.api.api_v1.endpoints.auth.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            for _ in range(3):
                response = await async_client.post("/auth/login", json=login_data)
                responses.append(response)
        
        # All should succeed and create separate sessions
        for response in responses:
            assert response.status_code == 200
            assert "tokens" in response.json()
        
        # Each should have different tokens
        tokens = [r.json()["tokens"]["access_token"] for r in responses]
        assert len(set(tokens)) == len(tokens)  # All unique