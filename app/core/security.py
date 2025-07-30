import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.config import settings
from app.schemas.auth import TokenType, TokenPayload


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class PasswordManager:
    """Password hashing and verification utilities."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_password_reset_token() -> str:
        """Generate a secure password reset token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_email_verification_token() -> str:
        """Generate a secure email verification token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def is_password_strong(password: str) -> bool:
        """Check if password meets strength requirements."""
        if not password or len(password) < 8:
            return False
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        return has_upper and has_lower and has_digit and has_special


class JWTManager:
    """JWT token generation and validation utilities."""
    
    # Token expiration times
    ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes
    REFRESH_TOKEN_EXPIRE_DAYS = 30    # 30 days
    EMAIL_VERIFICATION_EXPIRE_HOURS = 24  # 24 hours
    PASSWORD_RESET_EXPIRE_HOURS = 1   # 1 hour
    
    @classmethod
    def create_access_token(
        cls,
        user_id: str,
        email: str,
        session_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create an access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": user_id,
            "email": email,
            "token_type": TokenType.ACCESS.value,
            "session_id": session_id,
            "exp": expire,
            "iat": datetime.now()
        }
        
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    
    @classmethod
    def create_refresh_token(
        cls,
        user_id: str,
        email: str,
        session_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a refresh token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": user_id,
            "email": email,
            "token_type": TokenType.REFRESH.value,
            "session_id": session_id,
            "exp": expire,
            "iat": datetime.now()
        }
        
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    
    @classmethod
    def create_email_verification_token(
        cls,
        user_id: str,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create an email verification token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=cls.EMAIL_VERIFICATION_EXPIRE_HOURS)
        
        payload = {
            "sub": user_id,
            "email": email,
            "token_type": TokenType.EMAIL_VERIFICATION.value,
            "exp": expire,
            "iat": datetime.now()
        }
        
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    
    @classmethod
    def create_password_reset_token(
        cls,
        user_id: str,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a password reset token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=cls.PASSWORD_RESET_EXPIRE_HOURS)
        
        payload = {
            "sub": user_id,
            "email": email,
            "token_type": TokenType.PASSWORD_RESET.value,
            "exp": expire,
            "iat": datetime.now()
        }
        
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    
    @classmethod
    def decode_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            return payload
        except JWTError:
            return None
    
    @classmethod
    def validate_token_type(cls, payload: Dict[str, Any], expected_type: TokenType) -> bool:
        """Validate that the token is of the expected type."""
        token_type = payload.get("token_type")
        return token_type == expected_type.value
    
    @classmethod
    def is_token_expired(cls, payload: Dict[str, Any]) -> bool:
        """Check if a token is expired."""
        exp = payload.get("exp")
        if not exp:
            return True
        return datetime.utcnow().timestamp() > exp
    
    @classmethod
    def get_token_expiry_timestamp(cls, token_type: TokenType) -> int:
        """Get the expiry timestamp for a token type."""
        now = datetime.utcnow()
        if token_type == TokenType.ACCESS:
            expire = now + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        elif token_type == TokenType.REFRESH:
            expire = now + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)
        elif token_type == TokenType.EMAIL_VERIFICATION:
            expire = now + timedelta(hours=cls.EMAIL_VERIFICATION_EXPIRE_HOURS)
        elif token_type == TokenType.PASSWORD_RESET:
            expire = now + timedelta(hours=cls.PASSWORD_RESET_EXPIRE_HOURS)
        else:
            expire = now + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        return int(expire.timestamp())


class SecurityUtils:
    """General security utilities."""
    
    @staticmethod
    def generate_session_id() -> str:
        """Generate a secure session ID."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_device_fingerprint(user_agent: str, ip_address: str) -> str:
        """Generate a device fingerprint from user agent and IP address."""
        combined = f"{user_agent}:{ip_address}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash a token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a CSRF token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def constant_time_compare(a: str, b: str) -> bool:
        """Compare two strings in constant time to prevent timing attacks."""
        return secrets.compare_digest(a, b)
    
    @staticmethod
    def verify_token_hash(token: str, token_hash: str) -> bool:
        """Verify a token against its hash."""
        return SecurityUtils.hash_token(token) == token_hash
    
    @staticmethod
    def generate_secure_random_string(length: int = 32) -> str:
        """Generate a secure random string of specified length."""
        return secrets.token_urlsafe(length)[:length]


class RateLimiter:
    """Simple in-memory rate limiter for authentication endpoints."""
    
    def __init__(self):
        self._attempts = {}
        self._blocked = {}
    
    def is_allowed(self, key: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
        """Check if a request is allowed based on rate limiting."""
        now = datetime.utcnow()
        
        # Check if currently blocked
        if key in self._blocked:
            if now < self._blocked[key]:
                return False
            else:
                # Unblock if block period has expired
                del self._blocked[key]
        
        # Initialize or clean up old attempts
        if key not in self._attempts:
            self._attempts[key] = []
        
        # Remove attempts outside the time window
        window_start = now - timedelta(minutes=window_minutes)
        self._attempts[key] = [
            attempt_time for attempt_time in self._attempts[key]
            if attempt_time > window_start
        ]
        
        # Check if under limit
        if len(self._attempts[key]) < max_attempts:
            self._attempts[key].append(now)
            return True
        
        # Block for the window period
        self._blocked[key] = now + timedelta(minutes=window_minutes)
        return False
    
    def reset_attempts(self, key: str):
        """Reset attempts for a key (e.g., after successful authentication)."""
        if key in self._attempts:
            del self._attempts[key]
        if key in self._blocked:
            del self._blocked[key]
    
    def get_retry_after(self, key: str) -> Optional[int]:
        """Get the number of seconds until retry is allowed."""
        if key in self._blocked:
            now = datetime.utcnow()
            if now < self._blocked[key]:
                return int((self._blocked[key] - now).total_seconds())
        return None
    
    def clear_all(self):
        """Clear all rate limiting data."""
        self._attempts.clear()
        self._blocked.clear()


# Global rate limiter instance
rate_limiter = RateLimiter()


# Utility functions for backward compatibility
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return PasswordManager.verify_password(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return PasswordManager.hash_password(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create access token - backward compatibility function."""
    user_id = data.get("sub")
    email = data.get("email", "")
    session_id = data.get("session_id", SecurityUtils.generate_session_id())
    
    return JWTManager.create_access_token(
        user_id=user_id,
        email=email,
        session_id=session_id,
        expires_delta=expires_delta
    )


def verify_token(token: str) -> Optional[str]:
    """Verify token and return user ID - backward compatibility function."""
    payload = JWTManager.decode_token(token)
    if payload:
        return payload.get("sub")
    return None