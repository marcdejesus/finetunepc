from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import JWTManager, SecurityUtils, rate_limiter
from app.models import User, UserSession
from app.schemas.auth import TokenType, DeviceInfo


# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


class AuthenticationError(HTTPException):
    """Custom authentication error."""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_device_info(request: Request) -> DeviceInfo:
    """Extract device information from request."""
    return DeviceInfo(
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )


async def get_current_user_session(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> tuple[User, UserSession]:
    """Get current user and session from access token."""
    
    if not credentials:
        raise AuthenticationError("Missing authentication token")
    
    # Decode and validate token
    payload = JWTManager.decode_token(credentials.credentials)
    if not payload:
        raise AuthenticationError("Invalid token")
    
    # Check token type
    if not JWTManager.validate_token_type(payload, TokenType.ACCESS):
        raise AuthenticationError("Invalid token type")
    
    # Check if token is expired
    if JWTManager.is_token_expired(payload):
        raise AuthenticationError("Token expired")
    
    # Extract user and session information
    user_id = payload.get("sub")
    session_id = payload.get("session_id")
    
    if not user_id or not session_id:
        raise AuthenticationError("Invalid token payload")
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise AuthenticationError("User not found")
    
    # Check if user is active and not deleted
    if not user.is_active or user.deleted_at:
        raise AuthenticationError("Account is inactive or deleted")
    
    # Get session from database
    result = await db.execute(
        select(UserSession).where(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id,
                UserSession.is_active == True
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise AuthenticationError("Session not found or expired")
    
    # Check if session is expired
    if session.is_access_token_expired():
        raise AuthenticationError("Session expired")
    
    # Update session last used time
    session.last_used_at = JWTManager.datetime.utcnow()
    await db.commit()
    
    return user, session


async def get_current_user(
    user_session: tuple[User, UserSession] = Depends(get_current_user_session)
) -> User:
    """Get current authenticated user."""
    user, _ = user_session
    return user


async def get_current_session(
    user_session: tuple[User, UserSession] = Depends(get_current_user_session)
) -> UserSession:
    """Get current user session."""
    _, session = user_session
    return session


async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    return user


async def get_current_verified_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get current user with verified email."""
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return user


async def get_current_superuser(
    user: User = Depends(get_current_user)
) -> User:
    """Get current superuser."""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges"
        )
    return user


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    
    if not credentials:
        return None
    
    try:
        user, _ = await get_current_user_session(db, credentials)
        return user
    except HTTPException:
        return None


def require_permissions(*permissions: str):
    """Dependency factory for permission-based access control."""
    
    def permission_checker(user: User = Depends(get_current_user)) -> User:
        # This is a placeholder for future permission system
        # For now, just return the user
        return user
    
    return permission_checker


def rate_limit(max_attempts: int = 10, window_minutes: int = 15):
    """Dependency factory for rate limiting."""
    
    def rate_limiter_dependency(
        request: Request,
        device_info: DeviceInfo = Depends(get_device_info)
    ):
        # Create rate limiting key based on IP address
        rate_key = f"api:{device_info.ip_address}" if device_info.ip_address else "api:unknown"
        
        if not rate_limiter.is_allowed(rate_key, max_attempts, window_minutes):
            retry_after = rate_limiter.get_retry_after(rate_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        return True
    
    return rate_limiter_dependency


# Specialized dependencies for different user types
async def get_customer_user(
    user: User = Depends(get_current_verified_user)
) -> User:
    """Get current user as a customer (verified and active)."""
    return user


async def get_admin_user(
    user: User = Depends(get_current_superuser)
) -> User:
    """Get current user as an admin (superuser)."""
    return user


# Authentication helpers for different scenarios
class AuthDependencies:
    """Collection of authentication dependencies for different use cases."""
    
    @staticmethod
    def required(verified: bool = False) -> callable:
        """Get dependency for required authentication."""
        if verified:
            return get_current_verified_user
        return get_current_active_user
    
    @staticmethod
    def optional() -> callable:
        """Get dependency for optional authentication."""
        return get_optional_current_user
    
    @staticmethod
    def admin() -> callable:
        """Get dependency for admin authentication."""
        return get_current_superuser
    
    @staticmethod
    def with_session() -> callable:
        """Get dependency that returns both user and session."""
        return get_current_user_session


# Backward compatibility
async def get_current_user_old(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Backward compatibility function for existing endpoints."""
    try:
        user, _ = await get_current_user_session(db, credentials)
        return user
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e.detail),
            headers={"WWW-Authenticate": "Bearer"},
        )