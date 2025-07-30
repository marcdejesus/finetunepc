"""Simple security unit tests without database dependencies."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Test security utilities directly
def test_password_hashing():
    """Test password hashing functionality."""
    from app.core.security import PasswordManager
    
    password = "TestPassword123!"
    hashed = PasswordManager.hash_password(password)
    
    # Verify hash is different from original
    assert hashed != password
    assert len(hashed) > 50  # bcrypt hashes are typically 60 chars
    assert hashed.startswith("$2b$")  # bcrypt identifier
    
    # Verify password verification works
    assert PasswordManager.verify_password(password, hashed) is True
    assert PasswordManager.verify_password("wrong_password", hashed) is False


def test_password_strength_validation():
    """Test password strength validation."""
    from app.core.security import PasswordManager
    
    # Valid strong passwords
    assert PasswordManager.is_password_strong("TestPassword123!") is True
    assert PasswordManager.is_password_strong("MySecure@Pass1") is True
    
    # Invalid weak passwords
    assert PasswordManager.is_password_strong("weak") is False  # Too short
    assert PasswordManager.is_password_strong("nouppercase123!") is False  # No uppercase
    assert PasswordManager.is_password_strong("NOLOWERCASE123!") is False  # No lowercase
    assert PasswordManager.is_password_strong("NoNumbers!") is False  # No numbers
    assert PasswordManager.is_password_strong("NoSpecialChars123") is False  # No special chars


def test_jwt_token_creation():
    """Test JWT token creation."""
    from app.core.security import JWTManager
    
    user_id = "user123"
    email = "test@example.com"
    session_id = "session123"
    
    # Test access token creation
    access_token = JWTManager.create_access_token(user_id, email, session_id)
    
    assert isinstance(access_token, str)
    assert len(access_token) > 100  # JWT tokens are typically long
    assert access_token.count(".") == 2  # JWT format has 3 parts separated by dots
    
    # Test refresh token creation
    refresh_token = JWTManager.create_refresh_token(user_id, email, session_id)
    
    assert isinstance(refresh_token, str)
    assert len(refresh_token) > 100
    assert refresh_token.count(".") == 2


def test_jwt_token_decoding():
    """Test JWT token decoding."""
    from app.core.security import JWTManager
    
    user_id = "user123"
    email = "test@example.com"
    session_id = "session123"
    
    # Create and decode access token
    access_token = JWTManager.create_access_token(user_id, email, session_id)
    payload = JWTManager.decode_token(access_token)
    
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["session_id"] == session_id
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_token_expiration():
    """Test JWT token expiration."""
    from app.core.security import JWTManager
    
    user_id = "user123"
    email = "test@example.com"
    session_id = "session123"
    
    # Create token with very short expiration
    token = JWTManager.create_access_token(
        user_id, email, session_id, 
        expires_delta=timedelta(microseconds=1)
    )
    
    # Wait a moment to ensure expiration
    import time
    time.sleep(0.001)
    
    # Token should be expired
    payload = JWTManager.decode_token(token)
    assert payload is None


def test_jwt_invalid_token():
    """Test handling of invalid JWT tokens."""
    from app.core.security import JWTManager
    
    # Test completely invalid token
    invalid_token = "invalid.jwt.token"
    payload = JWTManager.decode_token(invalid_token)
    assert payload is None
    
    # Test malformed token
    malformed_token = "not_a_jwt_at_all"
    payload = JWTManager.decode_token(malformed_token)
    assert payload is None


def test_token_type_validation():
    """Test token type validation."""
    from app.core.security import JWTManager, TokenType
    
    # Create payload with access token type
    payload = {"token_type": TokenType.ACCESS.value}
    
    assert JWTManager.validate_token_type(payload, TokenType.ACCESS) is True
    assert JWTManager.validate_token_type(payload, TokenType.REFRESH) is False
    assert JWTManager.validate_token_type(payload, TokenType.EMAIL_VERIFICATION) is False


def test_security_utils_session_id():
    """Test session ID generation."""
    from app.core.security import SecurityUtils
    
    session_id = SecurityUtils.generate_session_id()
    
    assert isinstance(session_id, str)
    assert len(session_id) > 20  # Should be reasonably long
    
    # Generate multiple IDs to test uniqueness
    ids = [SecurityUtils.generate_session_id() for _ in range(10)]
    assert len(set(ids)) == 10  # All should be unique


def test_security_utils_device_fingerprint():
    """Test device fingerprint generation."""
    from app.core.security import SecurityUtils
    
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


def test_security_utils_token_hashing():
    """Test token hashing utilities."""
    from app.core.security import SecurityUtils
    
    token = "sample.jwt.token"
    hashed = SecurityUtils.hash_token(token)
    
    assert isinstance(hashed, str)
    assert len(hashed) == 64  # SHA-256 hex digest length
    assert hashed != token
    
    # Same token should produce same hash
    hashed2 = SecurityUtils.hash_token(token)
    assert hashed == hashed2
    
    # Verify token hash
    assert SecurityUtils.verify_token_hash(token, hashed) is True
    assert SecurityUtils.verify_token_hash("wrong.token", hashed) is False


def test_security_utils_random_string():
    """Test secure random string generation."""
    from app.core.security import SecurityUtils
    
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


def test_rate_limiter_basic():
    """Test basic rate limiter functionality."""
    from app.core.security import RateLimiter
    
    rate_limiter = RateLimiter()
    rate_limiter.clear_all()  # Start with clean slate
    
    key = "test_key"
    max_attempts = 3
    window_minutes = 1
    
    # First 3 requests should be allowed
    for _ in range(max_attempts):
        assert rate_limiter.is_allowed(key, max_attempts, window_minutes) is True
    
    # 4th request should be denied
    assert rate_limiter.is_allowed(key, max_attempts, window_minutes) is False


def test_rate_limiter_reset():
    """Test rate limiter reset functionality."""
    from app.core.security import RateLimiter
    
    rate_limiter = RateLimiter()
    rate_limiter.clear_all()
    
    key = "test_key"
    max_attempts = 1
    window_minutes = 1
    
    # Exhaust rate limit
    rate_limiter.is_allowed(key, max_attempts, window_minutes)
    assert rate_limiter.is_allowed(key, max_attempts, window_minutes) is False
    
    # Reset and try again
    rate_limiter.reset_attempts(key)
    assert rate_limiter.is_allowed(key, max_attempts, window_minutes) is True


def test_rate_limiter_different_keys():
    """Test that different keys are rate limited independently."""
    from app.core.security import RateLimiter
    
    rate_limiter = RateLimiter()
    rate_limiter.clear_all()
    
    key1 = "test_key1"
    key2 = "test_key2"
    max_attempts = 2
    window_minutes = 1
    
    # Exhaust key1
    for _ in range(max_attempts):
        assert rate_limiter.is_allowed(key1, max_attempts, window_minutes) is True
    assert rate_limiter.is_allowed(key1, max_attempts, window_minutes) is False
    
    # key2 should still work
    assert rate_limiter.is_allowed(key2, max_attempts, window_minutes) is True


@pytest.mark.asyncio
async def test_async_operations():
    """Test async operations work correctly."""
    from app.core.security import PasswordManager
    
    # Simulate async password verification
    async def verify_password_async(password: str, hashed: str) -> bool:
        # In real implementation, this might involve async operations
        return PasswordManager.verify_password(password, hashed)
    
    password = "TestPassword123!"
    hashed = PasswordManager.hash_password(password)
    
    result = await verify_password_async(password, hashed)
    assert result is True
    
    result = await verify_password_async("wrong_password", hashed)
    assert result is False


def test_email_verification_token():
    """Test email verification token creation."""
    from app.core.security import JWTManager, TokenType
    
    user_id = "user123"
    email = "test@example.com"
    
    token = JWTManager.create_email_verification_token(user_id, email)
    payload = JWTManager.decode_token(token)
    
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["token_type"] == TokenType.EMAIL_VERIFICATION.value


def test_password_reset_token():
    """Test password reset token creation."""
    from app.core.security import JWTManager, TokenType
    
    user_id = "user123"
    email = "test@example.com"
    
    token = JWTManager.create_password_reset_token(user_id, email)
    payload = JWTManager.decode_token(token)
    
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["token_type"] == TokenType.PASSWORD_RESET.value


class TestSecurityIntegration:
    """Integration tests for security components."""
    
    def test_complete_auth_flow_simulation(self):
        """Test a complete authentication flow simulation."""
        from app.core.security import PasswordManager, JWTManager, SecurityUtils
        
        # Step 1: User registration - hash password
        password = "UserPassword123!"
        hashed_password = PasswordManager.hash_password(password)
        
        # Step 2: User login - verify password and create tokens
        assert PasswordManager.verify_password(password, hashed_password) is True
        
        user_id = "user123"
        email = "user@example.com"
        session_id = SecurityUtils.generate_session_id()
        
        access_token = JWTManager.create_access_token(user_id, email, session_id)
        refresh_token = JWTManager.create_refresh_token(user_id, email, session_id)
        
        # Step 3: Token verification
        access_payload = JWTManager.decode_token(access_token)
        refresh_payload = JWTManager.decode_token(refresh_token)
        
        assert access_payload["sub"] == user_id
        assert refresh_payload["sub"] == user_id
        
        # Step 4: Create device fingerprint
        fingerprint = SecurityUtils.generate_device_fingerprint(
            "Test User Agent", "192.168.1.1"
        )
        
        assert len(fingerprint) > 30
    
    def test_security_edge_cases(self):
        """Test security edge cases."""
        from app.core.security import JWTManager, PasswordManager
        
        # Test empty/None inputs
        assert JWTManager.decode_token(None) is None
        assert JWTManager.decode_token("") is None
        
        # Test invalid password verification
        assert PasswordManager.verify_password("", "invalid_hash") is False
        assert PasswordManager.verify_password(None, None) is False
        
        # Test malformed tokens
        malformed_tokens = [
            "just.two.parts",
            "only_one_part",
            "",
            "too.many.parts.here.invalid",
        ]
        
        for token in malformed_tokens:
            assert JWTManager.decode_token(token) is None