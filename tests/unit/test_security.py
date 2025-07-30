"""Unit tests for security utilities."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.core.security import (
    PasswordManager, JWTManager, SecurityUtils, RateLimiter, TokenType
)
from app.schemas.auth import TokenType as SchemaTokenType


@pytest.mark.unit
class TestPasswordManager:
    """Test password management functionality."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 50  # bcrypt hashes are typically 60 chars
        assert hashed.startswith("$2b$")  # bcrypt identifier
    
    def test_verify_password_correct(self):
        """Test correct password verification."""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        assert PasswordManager.verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test incorrect password verification."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = PasswordManager.hash_password(password)
        
        assert PasswordManager.verify_password(wrong_password, hashed) is False
    
    def test_password_strength_validation(self):
        """Test password strength validation."""
        # Valid passwords
        assert PasswordManager.is_password_strong("TestPassword123!") is True
        assert PasswordManager.is_password_strong("MySecure@Pass1") is True
        
        # Invalid passwords
        assert PasswordManager.is_password_strong("weak") is False  # Too short
        assert PasswordManager.is_password_strong("nouppercase123!") is False  # No uppercase
        assert PasswordManager.is_password_strong("NOLOWERCASE123!") is False  # No lowercase
        assert PasswordManager.is_password_strong("NoNumbers!") is False  # No numbers
        assert PasswordManager.is_password_strong("NoSpecialChars123") is False  # No special chars


@pytest.mark.unit
class TestJWTManager:
    """Test JWT token management."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        user_id = "user123"
        email = "test@example.com"
        session_id = "session123"
        
        token = JWTManager.create_access_token(user_id, email, session_id)
        
        assert isinstance(token, str)
        assert len(token) > 100  # JWT tokens are typically long
        assert "." in token  # JWT format has dots
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        user_id = "user123"
        email = "test@example.com"
        session_id = "session123"
        
        token = JWTManager.create_refresh_token(user_id, email, session_id)
        
        assert isinstance(token, str)
        assert len(token) > 100
        assert "." in token
    
    def test_decode_valid_token(self):
        """Test decoding a valid token."""
        user_id = "user123"
        email = "test@example.com"
        session_id = "session123"
        
        token = JWTManager.create_access_token(user_id, email, session_id)
        payload = JWTManager.decode_token(token)
        
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["session_id"] == session_id
        assert payload["token_type"] == TokenType.ACCESS.value
    
    def test_decode_invalid_token(self):
        """Test decoding an invalid token."""
        invalid_token = "invalid.jwt.token"
        payload = JWTManager.decode_token(invalid_token)
        
        assert payload is None
    
    def test_decode_expired_token(self):
        """Test decoding an expired token."""
        user_id = "user123"
        email = "test@example.com"
        session_id = "session123"
        
        # Create token with very short expiration
        token = JWTManager.create_access_token(
            user_id, email, session_id, 
            expires_delta=timedelta(microseconds=1)
        )
        
        # Wait a bit to ensure expiration
        import time
        time.sleep(0.001)
        
        payload = JWTManager.decode_token(token)
        assert payload is None  # Should be None for expired token
    
    def test_validate_token_type(self):
        """Test token type validation."""
        payload = {"token_type": TokenType.ACCESS.value}
        
        assert JWTManager.validate_token_type(payload, TokenType.ACCESS) is True
        assert JWTManager.validate_token_type(payload, TokenType.REFRESH) is False
    
    def test_is_token_expired(self):
        """Test token expiration checking."""
        # Non-expired token
        future_exp = datetime.utcnow() + timedelta(hours=1)
        payload = {"exp": int(future_exp.timestamp())}
        assert JWTManager.is_token_expired(payload) is False
        
        # Expired token
        past_exp = datetime.utcnow() - timedelta(hours=1)
        payload = {"exp": int(past_exp.timestamp())}
        assert JWTManager.is_token_expired(payload) is True
    
    def test_create_email_verification_token(self):
        """Test email verification token creation."""
        user_id = "user123"
        email = "test@example.com"
        
        token = JWTManager.create_email_verification_token(user_id, email)
        payload = JWTManager.decode_token(token)
        
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["token_type"] == TokenType.EMAIL_VERIFICATION.value
    
    def test_create_password_reset_token(self):
        """Test password reset token creation."""
        user_id = "user123"
        email = "test@example.com"
        
        token = JWTManager.create_password_reset_token(user_id, email)
        payload = JWTManager.decode_token(token)
        
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["token_type"] == TokenType.PASSWORD_RESET.value


@pytest.mark.unit
class TestSecurityUtils:
    """Test security utility functions."""
    
    def test_generate_session_id(self):
        """Test session ID generation."""
        session_id = SecurityUtils.generate_session_id()
        
        assert isinstance(session_id, str)
        assert len(session_id) > 20  # Should be reasonably long
        
        # Generate multiple IDs to test uniqueness
        ids = [SecurityUtils.generate_session_id() for _ in range(10)]
        assert len(set(ids)) == 10  # All should be unique
    
    def test_generate_device_fingerprint(self):
        """Test device fingerprint generation."""
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        ip_address = "192.168.1.1"
        
        fingerprint = SecurityUtils.generate_device_fingerprint(user_agent, ip_address)
        
        assert isinstance(fingerprint, str)
        assert len(fingerprint) > 30  # Should be a hash
        
        # Same inputs should produce same fingerprint
        fingerprint2 = SecurityUtils.generate_device_fingerprint(user_agent, ip_address)
        assert fingerprint == fingerprint2
        
        # Different inputs should produce different fingerprints
        fingerprint3 = SecurityUtils.generate_device_fingerprint("Different Agent", ip_address)
        assert fingerprint != fingerprint3
    
    def test_hash_token(self):
        """Test token hashing."""
        token = "sample.jwt.token"
        hashed = SecurityUtils.hash_token(token)
        
        assert isinstance(hashed, str)
        assert len(hashed) == 64  # SHA-256 hex digest length
        assert hashed != token
        
        # Same token should produce same hash
        hashed2 = SecurityUtils.hash_token(token)
        assert hashed == hashed2
    
    def test_verify_token_hash(self):
        """Test token hash verification."""
        token = "sample.jwt.token"
        hashed = SecurityUtils.hash_token(token)
        
        assert SecurityUtils.verify_token_hash(token, hashed) is True
        assert SecurityUtils.verify_token_hash("wrong.token", hashed) is False
    
    def test_generate_secure_random_string(self):
        """Test secure random string generation."""
        # Test default length
        random_str = SecurityUtils.generate_secure_random_string()
        assert isinstance(random_str, str)
        assert len(random_str) == 32  # Default length
        
        # Test custom length
        random_str_custom = SecurityUtils.generate_secure_random_string(64)
        assert len(random_str_custom) == 64
        
        # Test uniqueness
        strings = [SecurityUtils.generate_secure_random_string() for _ in range(10)]
        assert len(set(strings)) == 10  # All should be unique


@pytest.mark.unit
class TestRateLimiter:
    """Test rate limiting functionality."""
    
    def setup_method(self):
        """Set up test method."""
        self.rate_limiter = RateLimiter()
        self.rate_limiter.clear_all()  # Start with clean slate
    
    def test_initial_request_allowed(self):
        """Test that initial requests are allowed."""
        key = "test_key"
        assert self.rate_limiter.is_allowed(key, max_attempts=5, window_minutes=1) is True
    
    def test_rate_limit_enforcement(self):
        """Test rate limit enforcement."""
        key = "test_key"
        max_attempts = 3
        window_minutes = 1
        
        # First 3 requests should be allowed
        for _ in range(max_attempts):
            assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is True
        
        # 4th request should be denied
        assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is False
    
    def test_different_keys_independent(self):
        """Test that different keys are rate limited independently."""
        key1 = "test_key1"
        key2 = "test_key2"
        max_attempts = 2
        window_minutes = 1
        
        # Exhaust key1
        for _ in range(max_attempts):
            assert self.rate_limiter.is_allowed(key1, max_attempts, window_minutes) is True
        assert self.rate_limiter.is_allowed(key1, max_attempts, window_minutes) is False
        
        # key2 should still work
        assert self.rate_limiter.is_allowed(key2, max_attempts, window_minutes) is True
    
    def test_get_retry_after(self):
        """Test retry after calculation."""
        key = "test_key"
        max_attempts = 1
        window_minutes = 1
        
        # Make request to trigger rate limit
        self.rate_limiter.is_allowed(key, max_attempts, window_minutes)
        self.rate_limiter.is_allowed(key, max_attempts, window_minutes)  # This should be blocked
        
        retry_after = self.rate_limiter.get_retry_after(key)
        assert isinstance(retry_after, int)
        assert 0 <= retry_after <= 60  # Should be within the window
    
    def test_reset_attempts(self):
        """Test resetting attempts for a key."""
        key = "test_key"
        max_attempts = 1
        window_minutes = 1
        
        # Exhaust rate limit
        self.rate_limiter.is_allowed(key, max_attempts, window_minutes)
        assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is False
        
        # Reset and try again
        self.rate_limiter.reset_attempts(key)
        assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is True
    
    def test_get_current_attempts(self):
        """Test getting current attempt count."""
        key = "test_key"
        max_attempts = 5
        window_minutes = 1
        
        assert self.rate_limiter.get_current_attempts(key) == 0
        
        # Make some requests
        for i in range(3):
            self.rate_limiter.is_allowed(key, max_attempts, window_minutes)
            assert self.rate_limiter.get_current_attempts(key) == i + 1
    
    def test_clear_all(self):
        """Test clearing all rate limit data."""
        key1 = "test_key1"
        key2 = "test_key2"
        max_attempts = 1
        window_minutes = 1
        
        # Make requests with different keys
        self.rate_limiter.is_allowed(key1, max_attempts, window_minutes)
        self.rate_limiter.is_allowed(key2, max_attempts, window_minutes)
        
        assert self.rate_limiter.get_current_attempts(key1) == 1
        assert self.rate_limiter.get_current_attempts(key2) == 1
        
        # Clear all and verify
        self.rate_limiter.clear_all()
        assert self.rate_limiter.get_current_attempts(key1) == 0
        assert self.rate_limiter.get_current_attempts(key2) == 0
    
    @patch('app.core.security.time.time')
    def test_window_expiration(self, mock_time):
        """Test that rate limit windows expire correctly."""
        key = "test_key"
        max_attempts = 1
        window_minutes = 1
        
        # Set initial time
        mock_time.return_value = 1000.0
        
        # Exhaust rate limit
        self.rate_limiter.is_allowed(key, max_attempts, window_minutes)
        assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is False
        
        # Move time forward past window
        mock_time.return_value = 1000.0 + (window_minutes * 60) + 1
        
        # Should be allowed again
        assert self.rate_limiter.is_allowed(key, max_attempts, window_minutes) is True