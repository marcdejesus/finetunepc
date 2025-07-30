"""Unit tests for authentication service."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.services.auth_service import AuthenticationService
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, DeviceInfo
from app.models import User, UserSession
from tests.fixtures.factories import UserFactory, UserSessionFactory


@pytest.mark.unit
@pytest.mark.asyncio
class TestAuthenticationService:
    """Test AuthenticationService functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return AsyncMock()
    
    @pytest.fixture
    def auth_service(self, mock_db_session):
        """Create AuthenticationService instance."""
        return AuthenticationService(mock_db_session)
    
    @pytest.fixture
    def sample_register_data(self):
        """Sample registration data."""
        return UserRegisterRequest(
            email="test@example.com",
            password="TestPassword123!",
            first_name="Test",
            last_name="User",
            phone_number="+1234567890"
        )
    
    @pytest.fixture
    def sample_login_data(self):
        """Sample login data."""
        return UserLoginRequest(
            email="test@example.com",
            password="TestPassword123!",
            remember_me=False
        )
    
    @pytest.fixture
    def sample_device_info(self):
        """Sample device info."""
        return DeviceInfo(
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Agent"
        )
    
    async def test_register_user_success(self, auth_service, mock_db_session, sample_register_data):
        """Test successful user registration."""
        # Mock that user doesn't exist
        auth_service._get_user_by_email = AsyncMock(return_value=None)
        
        # Mock rate limiter
        with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            # Mock JWT manager
            with patch('app.services.auth_service.JWTManager') as mock_jwt:
                mock_jwt.create_email_verification_token.return_value = "verification_token"
                
                user, verification_token = await auth_service.register_user(
                    sample_register_data, "192.168.1.1"
                )
                
                assert user.email == sample_register_data.email
                assert user.first_name == sample_register_data.first_name
                assert user.last_name == sample_register_data.last_name
                assert user.phone_number == sample_register_data.phone_number
                assert user.email_verified is False
                assert user.is_active is True
                assert verification_token == "verification_token"
                
                # Verify database operations
                mock_db_session.add.assert_called_once()
                mock_db_session.commit.assert_called_once()
                mock_db_session.refresh.assert_called_once()
    
    async def test_register_user_already_exists(self, auth_service, sample_register_data):
        """Test registration with existing user."""
        # Mock that user already exists
        existing_user = UserFactory(email=sample_register_data.email)
        auth_service._get_user_by_email = AsyncMock(return_value=existing_user)
        
        with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_register_data, "192.168.1.1")
            
            assert exc_info.value.status_code == 409
            assert "already exists" in str(exc_info.value.detail)
    
    async def test_register_user_rate_limited(self, auth_service, sample_register_data):
        """Test registration when rate limited."""
        with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = False
            mock_rate_limiter.get_retry_after.return_value = 60
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.register_user(sample_register_data, "192.168.1.1")
            
            assert exc_info.value.status_code == 429
            assert "rate limit" in str(exc_info.value.detail).lower()
    
    async def test_authenticate_user_success(self, auth_service, sample_login_data, sample_device_info):
        """Test successful user authentication."""
        # Create a user with hashed password
        user = UserFactory(email=sample_login_data.email)
        auth_service._get_user_by_email = AsyncMock(return_value=user)
        
        # Mock password verification
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = True
            
            # Mock rate limiter
            with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
                mock_rate_limiter.is_allowed.return_value = True
                
                # Mock session creation and token generation
                mock_session = UserSessionFactory(user_id=user.id)
                auth_service._create_user_session = AsyncMock(return_value=mock_session)
                
                mock_token_pair = Mock()
                mock_token_pair.access_token = "access_token"
                mock_token_pair.refresh_token = "refresh_token"
                auth_service._generate_token_pair = Mock(return_value=mock_token_pair)
                
                result_user, tokens, session = await auth_service.authenticate_user(
                    sample_login_data, sample_device_info
                )
                
                assert result_user.email == user.email
                assert tokens.access_token == "access_token"
                assert tokens.refresh_token == "refresh_token"
                assert session.user_id == user.id
    
    async def test_authenticate_user_invalid_email(self, auth_service, sample_login_data, sample_device_info):
        """Test authentication with invalid email."""
        auth_service._get_user_by_email = AsyncMock(return_value=None)
        
        with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
            mock_rate_limiter.is_allowed.return_value = True
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.authenticate_user(sample_login_data, sample_device_info)
            
            assert exc_info.value.status_code == 401
            assert "Invalid email or password" in str(exc_info.value.detail)
    
    async def test_authenticate_user_invalid_password(self, auth_service, sample_login_data, sample_device_info):
        """Test authentication with invalid password."""
        user = UserFactory(email=sample_login_data.email)
        auth_service._get_user_by_email = AsyncMock(return_value=user)
        
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = False
            
            with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
                mock_rate_limiter.is_allowed.return_value = True
                
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.authenticate_user(sample_login_data, sample_device_info)
                
                assert exc_info.value.status_code == 401
                assert "Invalid email or password" in str(exc_info.value.detail)
    
    async def test_authenticate_user_inactive(self, auth_service, sample_login_data, sample_device_info):
        """Test authentication with inactive user."""
        user = UserFactory(email=sample_login_data.email, is_active=False)
        auth_service._get_user_by_email = AsyncMock(return_value=user)
        
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = True
            
            with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
                mock_rate_limiter.is_allowed.return_value = True
                
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.authenticate_user(sample_login_data, sample_device_info)
                
                assert exc_info.value.status_code == 401
                assert "deactivated" in str(exc_info.value.detail)
    
    async def test_authenticate_user_deleted(self, auth_service, sample_login_data, sample_device_info):
        """Test authentication with soft-deleted user."""
        user = UserFactory(email=sample_login_data.email, deleted_at=datetime.utcnow())
        auth_service._get_user_by_email = AsyncMock(return_value=user)
        
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = True
            
            with patch('app.services.auth_service.rate_limiter') as mock_rate_limiter:
                mock_rate_limiter.is_allowed.return_value = True
                
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.authenticate_user(sample_login_data, sample_device_info)
                
                assert exc_info.value.status_code == 401
                assert "not found" in str(exc_info.value.detail)
    
    async def test_refresh_token_success(self, auth_service):
        """Test successful token refresh."""
        user = UserFactory()
        session = UserSessionFactory(user_id=user.id)
        refresh_token = "valid_refresh_token"
        
        # Mock JWT decoding and validation
        mock_payload = {
            "sub": user.id,
            "session_id": session.id,
            "token_type": "refresh",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp())
        }
        
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = mock_payload
            mock_jwt.validate_token_type.return_value = True
            mock_jwt.is_token_expired.return_value = False
            mock_jwt.create_access_token.return_value = "new_access_token"
            
            auth_service._get_user_by_id = AsyncMock(return_value=user)
            auth_service._get_active_session = AsyncMock(return_value=session)
            
            token_pair = await auth_service.refresh_token(refresh_token)
            
            assert token_pair.access_token == "new_access_token"
            assert token_pair.refresh_token == refresh_token  # Should remain the same
            assert token_pair.token_type == "bearer"
    
    async def test_refresh_token_invalid(self, auth_service):
        """Test token refresh with invalid token."""
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = None
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.refresh_token("invalid_token")
            
            assert exc_info.value.status_code == 401
            assert "Invalid refresh token" in str(exc_info.value.detail)
    
    async def test_refresh_token_expired(self, auth_service):
        """Test token refresh with expired token."""
        mock_payload = {"token_type": "refresh"}
        
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = mock_payload
            mock_jwt.validate_token_type.return_value = True
            mock_jwt.is_token_expired.return_value = True
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.refresh_token("expired_token")
            
            assert exc_info.value.status_code == 401
            assert "expired" in str(exc_info.value.detail)
    
    async def test_verify_email_success(self, auth_service):
        """Test successful email verification."""
        user = UserFactory(email_verified=False)
        verification_token = "valid_verification_token"
        
        mock_payload = {
            "sub": user.id,
            "email": user.email,
            "token_type": "email_verification",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp())
        }
        
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = mock_payload
            mock_jwt.validate_token_type.return_value = True
            mock_jwt.is_token_expired.return_value = False
            
            auth_service._get_user_by_id = AsyncMock(return_value=user)
            
            result_user = await auth_service.verify_email(verification_token)
            
            assert result_user.email_verified is True
    
    async def test_verify_email_invalid_token(self, auth_service):
        """Test email verification with invalid token."""
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = None
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.verify_email("invalid_token")
            
            assert exc_info.value.status_code == 400
            assert "Invalid verification token" in str(exc_info.value.detail)
    
    async def test_request_password_reset_success(self, auth_service):
        """Test successful password reset request."""
        user = UserFactory()
        
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.create_password_reset_token.return_value = "reset_token"
            
            auth_service._get_user_by_email = AsyncMock(return_value=user)
            
            token = await auth_service.request_password_reset(user.email)
            
            assert token == "reset_token"
    
    async def test_request_password_reset_user_not_found(self, auth_service):
        """Test password reset request for non-existent user."""
        auth_service._get_user_by_email = AsyncMock(return_value=None)
        
        token = await auth_service.request_password_reset("nonexistent@example.com")
        
        # Should return None for security (don't reveal if user exists)
        assert token is None
    
    async def test_reset_password_success(self, auth_service):
        """Test successful password reset."""
        user = UserFactory()
        reset_token = "valid_reset_token"
        new_password = "NewPassword123!"
        
        mock_payload = {
            "sub": user.id,
            "email": user.email,
            "token_type": "password_reset",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp())
        }
        
        with patch('app.services.auth_service.JWTManager') as mock_jwt:
            mock_jwt.decode_token.return_value = mock_payload
            mock_jwt.validate_token_type.return_value = True
            mock_jwt.is_token_expired.return_value = False
            
            with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
                mock_password_manager.hash_password.return_value = "hashed_new_password"
                
                auth_service._get_user_by_id = AsyncMock(return_value=user)
                auth_service._revoke_all_user_sessions = AsyncMock(return_value=2)
                
                result_user = await auth_service.reset_password(reset_token, new_password)
                
                assert result_user.hashed_password == "hashed_new_password"
                # Should revoke all sessions for security
                auth_service._revoke_all_user_sessions.assert_called_once_with(user.id)
    
    async def test_change_password_success(self, auth_service):
        """Test successful password change."""
        user = UserFactory()
        current_password = "CurrentPassword123!"
        new_password = "NewPassword123!"
        
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = True
            mock_password_manager.hash_password.return_value = "hashed_new_password"
            
            result_user = await auth_service.change_password(
                user, current_password, new_password
            )
            
            assert result_user.hashed_password == "hashed_new_password"
    
    async def test_change_password_wrong_current(self, auth_service):
        """Test password change with wrong current password."""
        user = UserFactory()
        current_password = "WrongPassword123!"
        new_password = "NewPassword123!"
        
        with patch('app.services.auth_service.PasswordManager') as mock_password_manager:
            mock_password_manager.verify_password.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.change_password(user, current_password, new_password)
            
            assert exc_info.value.status_code == 400
            assert "incorrect" in str(exc_info.value.detail)
    
    async def test_logout_user_single_session(self, auth_service):
        """Test logging out a single session."""
        session_id = "session123"
        
        auth_service._revoke_session = AsyncMock(return_value=1)
        
        revoked_count = await auth_service.logout_user(session_id, revoke_all=False)
        
        assert revoked_count == 1
        auth_service._revoke_session.assert_called_once_with(session_id)
    
    async def test_logout_user_all_sessions(self, auth_service):
        """Test logging out all sessions."""
        session = UserSessionFactory()
        
        auth_service._get_session_by_id = AsyncMock(return_value=session)
        auth_service._revoke_all_user_sessions = AsyncMock(return_value=3)
        
        revoked_count = await auth_service.logout_user(session.id, revoke_all=True)
        
        assert revoked_count == 3
        auth_service._revoke_all_user_sessions.assert_called_once_with(session.user_id)
    
    async def test_get_user_sessions(self, auth_service, mock_db_session):
        """Test getting user sessions."""
        user_id = "user123"
        current_session_id = "current_session"
        
        # Mock database query result
        mock_sessions = [
            UserSessionFactory(id=current_session_id, user_id=user_id),
            UserSessionFactory(id="other_session", user_id=user_id)
        ]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_sessions
        mock_db_session.execute.return_value = mock_result
        
        sessions = await auth_service.get_user_sessions(user_id, current_session_id)
        
        assert len(sessions) == 2
        assert sessions[0].is_current is True  # Current session marked
        assert sessions[1].is_current is False
    
    async def test_revoke_session_success(self, auth_service, mock_db_session):
        """Test successful session revocation."""
        session_id = "session123"
        user_id = "user123"
        
        mock_session = UserSessionFactory(id=session_id, user_id=user_id, is_active=True)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = mock_result
        
        success = await auth_service.revoke_session(session_id, user_id)
        
        assert success is True
        assert mock_session.is_active is False
        mock_db_session.commit.assert_called_once()
    
    async def test_revoke_session_not_found(self, auth_service, mock_db_session):
        """Test session revocation when session not found."""
        session_id = "nonexistent_session"
        user_id = "user123"
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        success = await auth_service.revoke_session(session_id, user_id)
        
        assert success is False