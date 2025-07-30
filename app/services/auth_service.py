from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status

from app.models import User, UserSession
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, TokenPair, UserProfileResponse,
    DeviceInfo, TokenType
)
from app.core.security import (
    PasswordManager, JWTManager, SecurityUtils, rate_limiter
)


class AuthenticationService:
    """Authentication service for handling user registration, login, and session management."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register_user(
        self, 
        user_data: UserRegisterRequest,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str]:
        """Register a new user and generate email verification token."""
        
        # Check if rate limiting allows this registration
        rate_key = f"register:{ip_address}" if ip_address else "register:unknown"
        if not rate_limiter.is_allowed(rate_key, max_attempts=3, window_minutes=60):
            retry_after = rate_limiter.get_retry_after(rate_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many registration attempts. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        # Check if user already exists
        existing_user = await self._get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create new user
        hashed_password = PasswordManager.hash_password(user_data.password)
        
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone_number=user_data.phone_number,
            hashed_password=hashed_password,
            email_verified=False,
            is_active=True
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        # Generate email verification token
        verification_token = JWTManager.create_email_verification_token(
            user_id=user.id,
            email=user.email
        )
        
        # Reset rate limiting on successful registration
        rate_limiter.reset_attempts(rate_key)
        
        return user, verification_token
    
    async def authenticate_user(
        self,
        login_data: UserLoginRequest,
        device_info: DeviceInfo
    ) -> Tuple[User, TokenPair, UserSession]:
        """Authenticate user and create session with token pair."""
        
        # Rate limiting by IP
        rate_key = f"login:{device_info.ip_address}" if device_info.ip_address else "login:unknown"
        if not rate_limiter.is_allowed(rate_key, max_attempts=5, window_minutes=15):
            retry_after = rate_limiter.get_retry_after(rate_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        # Get user by email
        user = await self._get_user_by_email(login_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not PasswordManager.verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Check if user is soft deleted
        if user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found"
            )
        
        # Create session
        session = await self._create_user_session(user, device_info, login_data.remember_me)
        
        # Generate token pair
        token_pair = self._generate_token_pair(user, session, login_data.remember_me)
        
        # Reset rate limiting on successful login
        rate_limiter.reset_attempts(rate_key)
        
        return user, token_pair, session
    
    async def refresh_token(self, refresh_token: str) -> TokenPair:
        """Refresh access token using refresh token."""
        
        # Decode and validate refresh token
        payload = JWTManager.decode_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check token type
        if not JWTManager.validate_token_type(payload, TokenType.REFRESH):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Check if token is expired
        if JWTManager.is_token_expired(payload):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )
        
        # Get user and session
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        user = await self._get_user_by_id(user_id)
        if not user or not user.is_active or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        session = await self._get_active_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session not found or expired"
            )
        
        # Update session last used time
        session.last_used_at = datetime.utcnow()
        await self.db.commit()
        
        # Generate new access token (refresh token remains the same)
        access_token = JWTManager.create_access_token(
            user_id=user.id,
            email=user.email,
            session_id=session.id
        )
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,  # Keep the same refresh token
            token_type="bearer",
            expires_in=JWTManager.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def verify_email(self, token: str) -> User:
        """Verify user email using verification token."""
        
        # Decode and validate token
        payload = JWTManager.decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Check token type
        if not JWTManager.validate_token_type(payload, TokenType.EMAIL_VERIFICATION):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        # Check if token is expired
        if JWTManager.is_token_expired(payload):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token expired"
            )
        
        # Get user
        user_id = payload.get("sub")
        user = await self._get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify email
        user.email_verified = True
        await self.db.commit()
        
        return user
    
    async def request_password_reset(self, email: str) -> Optional[str]:
        """Request password reset and return reset token if user exists."""
        
        user = await self._get_user_by_email(email)
        if not user or not user.is_active or user.deleted_at:
            # Don't reveal if user exists or not for security
            return None
        
        # Generate password reset token
        reset_token = JWTManager.create_password_reset_token(
            user_id=user.id,
            email=user.email
        )
        
        return reset_token
    
    async def reset_password(self, token: str, new_password: str) -> User:
        """Reset user password using reset token."""
        
        # Decode and validate token
        payload = JWTManager.decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Check token type
        if not JWTManager.validate_token_type(payload, TokenType.PASSWORD_RESET):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        # Check if token is expired
        if JWTManager.is_token_expired(payload):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token expired"
            )
        
        # Get user
        user_id = payload.get("sub")
        user = await self._get_user_by_id(user_id)
        if not user or not user.is_active or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.hashed_password = PasswordManager.hash_password(new_password)
        await self.db.commit()
        
        # Revoke all user sessions for security
        await self._revoke_all_user_sessions(user.id)
        
        return user
    
    async def change_password(self, user: User, current_password: str, new_password: str) -> User:
        """Change user password after verifying current password."""
        
        # Verify current password
        if not PasswordManager.verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        user.hashed_password = PasswordManager.hash_password(new_password)
        await self.db.commit()
        
        return user
    
    async def logout_user(self, session_id: str, revoke_all: bool = False) -> int:
        """Logout user by revoking session(s)."""
        
        if revoke_all:
            # Get user ID from session
            session = await self._get_session_by_id(session_id)
            if session:
                return await self._revoke_all_user_sessions(session.user_id)
            return 0
        else:
            # Revoke single session
            return await self._revoke_session(session_id)
    
    async def get_user_sessions(self, user_id: str, current_session_id: str) -> list[UserSession]:
        """Get all active sessions for a user."""
        
        result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            ).order_by(UserSession.last_used_at.desc())
        )
        
        sessions = result.scalars().all()
        
        # Mark current session
        for session in sessions:
            session.is_current = session.id == current_session_id
        
        return sessions
    
    async def revoke_session(self, session_id: str, user_id: str) -> bool:
        """Revoke a specific session for a user."""
        
        result = await self.db.execute(
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
            return False
        
        session.is_active = False
        await self.db.commit()
        
        return True
    
    # Private helper methods
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def _create_user_session(
        self, 
        user: User, 
        device_info: DeviceInfo, 
        remember_me: bool = False
    ) -> UserSession:
        """Create a new user session."""
        
        # Generate session ID and device fingerprint
        session_id = SecurityUtils.generate_session_id()
        device_fingerprint = None
        
        if device_info.user_agent and device_info.ip_address:
            device_fingerprint = SecurityUtils.generate_device_fingerprint(
                device_info.user_agent, device_info.ip_address
            )
        
        # Calculate expiration time
        if remember_me:
            expires_at = datetime.utcnow() + timedelta(days=JWTManager.REFRESH_TOKEN_EXPIRE_DAYS)
        else:
            expires_at = datetime.utcnow() + timedelta(days=7)  # 7 days for regular sessions
        
        # Create session
        session = UserSession(
            id=session_id,
            user_id=user.id,
            access_token_hash="",  # Will be updated when tokens are generated
            refresh_token_hash="",
            access_token_expires_at=datetime.utcnow() + timedelta(minutes=JWTManager.ACCESS_TOKEN_EXPIRE_MINUTES),
            refresh_token_expires_at=expires_at,
            ip_address=device_info.ip_address,
            user_agent=device_info.user_agent,
            device_fingerprint=device_fingerprint,
            is_active=True,
            last_used_at=datetime.utcnow()
        )
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        return session
    
    def _generate_token_pair(self, user: User, session: UserSession, remember_me: bool = False) -> TokenPair:
        """Generate access and refresh token pair."""
        
        # Generate tokens
        access_token = JWTManager.create_access_token(
            user_id=user.id,
            email=user.email,
            session_id=session.id
        )
        
        refresh_expires_delta = None
        if remember_me:
            refresh_expires_delta = timedelta(days=JWTManager.REFRESH_TOKEN_EXPIRE_DAYS)
        
        refresh_token = JWTManager.create_refresh_token(
            user_id=user.id,
            email=user.email,
            session_id=session.id,
            expires_delta=refresh_expires_delta
        )
        
        # Store hashed tokens in session
        session.access_token_hash = SecurityUtils.hash_token(access_token)
        session.refresh_token_hash = SecurityUtils.hash_token(refresh_token)
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=JWTManager.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def _get_active_session(self, session_id: str, user_id: str) -> Optional[UserSession]:
        """Get active session by ID and user ID."""
        result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.id == session_id,
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_session_by_id(self, session_id: str) -> Optional[UserSession]:
        """Get session by ID."""
        result = await self.db.execute(
            select(UserSession).where(UserSession.id == session_id)
        )
        return result.scalar_one_or_none()
    
    async def _revoke_session(self, session_id: str) -> int:
        """Revoke a single session."""
        result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.id == session_id,
                    UserSession.is_active == True
                )
            )
        )
        
        session = result.scalar_one_or_none()
        if not session:
            return 0
        
        session.is_active = False
        await self.db.commit()
        
        return 1
    
    async def _revoke_all_user_sessions(self, user_id: str) -> int:
        """Revoke all sessions for a user."""
        result = await self.db.execute(
            select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            )
        )
        
        sessions = result.scalars().all()
        count = len(sessions)
        
        for session in sessions:
            session.is_active = False
        
        await self.db.commit()
        
        return count