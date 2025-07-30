from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import AuthenticationService
from app.api.dependencies import (
    get_device_info, get_current_user, get_current_session, rate_limit,
    get_current_verified_user, AuthDependencies
)
from app.schemas.auth import (
    UserRegisterRequest, UserRegisterResponse,
    UserLoginRequest, UserLoginResponse, TokenPair,
    TokenRefreshRequest, TokenRefreshResponse,
    EmailVerificationRequest, EmailVerificationResponse,
    ResendVerificationRequest, ResendVerificationResponse,
    PasswordResetRequest, PasswordResetResponse,
    PasswordResetConfirmRequest, PasswordResetConfirmResponse,
    PasswordChangeRequest, PasswordChangeResponse,
    UserSessionsResponse, RevokeSessionRequest, RevokeSessionResponse,
    RevokeAllSessionsResponse, LogoutRequest, LogoutResponse,
    UserProfileResponse, UserProfileUpdateRequest, UserProfileUpdateResponse,
    DeviceInfo, RateLimitResponse, AuthErrorResponse
)
from app.models import User, UserSession


router = APIRouter()


# User Registration
@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": AuthErrorResponse, "description": "User already exists"},
        429: {"model": RateLimitResponse, "description": "Rate limit exceeded"},
    }
)
async def register_user(
    user_data: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    device_info: DeviceInfo = Depends(get_device_info),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(rate_limit(max_attempts=3, window_minutes=60))
):
    """Register a new user account with email verification."""
    
    auth_service = AuthenticationService(db)
    user, verification_token = await auth_service.register_user(
        user_data, device_info.ip_address
    )
    
    # TODO: Send verification email in background task
    # background_tasks.add_task(send_verification_email, user.email, verification_token)
    
    return UserRegisterResponse(
        user_id=user.id,
        email=user.email,
        verification_required=True
    )


# User Login
@router.post(
    "/login",
    response_model=UserLoginResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Invalid credentials"},
        429: {"model": RateLimitResponse, "description": "Rate limit exceeded"},
    }
)
async def login_user(
    login_data: UserLoginRequest,
    device_info: DeviceInfo = Depends(get_device_info),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(rate_limit(max_attempts=5, window_minutes=15))
):
    """Authenticate user and return access/refresh token pair."""
    
    auth_service = AuthenticationService(db)
    user, tokens, session = await auth_service.authenticate_user(login_data, device_info)
    
    return UserLoginResponse(
        tokens=tokens,
        user=UserProfileResponse.from_orm(user)
    )


# Token Refresh
@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Invalid refresh token"},
    }
)
async def refresh_access_token(
    refresh_data: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    
    auth_service = AuthenticationService(db)
    token_pair = await auth_service.refresh_token(refresh_data.refresh_token)
    
    return TokenRefreshResponse(
        access_token=token_pair.access_token,
        expires_in=token_pair.expires_in
    )


# Email Verification
@router.post(
    "/verify-email",
    response_model=EmailVerificationResponse,
    responses={
        400: {"model": AuthErrorResponse, "description": "Invalid or expired token"},
    }
)
async def verify_email(
    verification_data: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify user email address using verification token."""
    
    auth_service = AuthenticationService(db)
    user = await auth_service.verify_email(verification_data.token)
    
    return EmailVerificationResponse()


# Resend Email Verification
@router.post(
    "/resend-verification",
    response_model=ResendVerificationResponse,
    responses={
        429: {"model": RateLimitResponse, "description": "Rate limit exceeded"},
    }
)
async def resend_verification_email(
    resend_data: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    device_info: DeviceInfo = Depends(get_device_info),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(rate_limit(max_attempts=3, window_minutes=15))
):
    """Resend email verification token."""
    
    auth_service = AuthenticationService(db)
    user = await auth_service._get_user_by_email(resend_data.email)
    
    if user and not user.email_verified:
        verification_token = auth_service.JWTManager.create_email_verification_token(
            user_id=user.id,
            email=user.email
        )
        # TODO: Send verification email in background task
        # background_tasks.add_task(send_verification_email, user.email, verification_token)
    
    # Always return success to prevent email enumeration
    return ResendVerificationResponse()


# Password Reset Request
@router.post(
    "/password-reset",
    response_model=PasswordResetResponse,
    responses={
        429: {"model": RateLimitResponse, "description": "Rate limit exceeded"},
    }
)
async def request_password_reset(
    reset_data: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    device_info: DeviceInfo = Depends(get_device_info),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(rate_limit(max_attempts=3, window_minutes=15))
):
    """Request password reset email."""
    
    auth_service = AuthenticationService(db)
    reset_token = await auth_service.request_password_reset(reset_data.email)
    
    if reset_token:
        # TODO: Send password reset email in background task
        # background_tasks.add_task(send_password_reset_email, reset_data.email, reset_token)
        pass
    
    # Always return success to prevent email enumeration
    return PasswordResetResponse()


# Password Reset Confirmation
@router.post(
    "/password-reset/confirm",
    response_model=PasswordResetConfirmResponse,
    responses={
        400: {"model": AuthErrorResponse, "description": "Invalid or expired token"},
    }
)
async def confirm_password_reset(
    confirm_data: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset with new password."""
    
    auth_service = AuthenticationService(db)
    user = await auth_service.reset_password(
        confirm_data.token, 
        confirm_data.new_password
    )
    
    return PasswordResetConfirmResponse()


# Password Change (Authenticated)
@router.post(
    "/password/change",
    response_model=PasswordChangeResponse,
    responses={
        400: {"model": AuthErrorResponse, "description": "Current password incorrect"},
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def change_password(
    change_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password (requires current password)."""
    
    auth_service = AuthenticationService(db)
    user = await auth_service.change_password(
        current_user,
        change_data.current_password,
        change_data.new_password
    )
    
    return PasswordChangeResponse()


# User Profile
@router.get(
    "/me",
    response_model=UserProfileResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile information."""
    
    return UserProfileResponse.from_orm(current_user)


# Update User Profile
@router.patch(
    "/me",
    response_model=UserProfileUpdateResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def update_user_profile(
    profile_data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile information."""
    
    # Update user fields
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserProfileUpdateResponse(
        user=UserProfileResponse.from_orm(current_user)
    )


# User Sessions Management
@router.get(
    "/sessions",
    response_model=UserSessionsResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
):
    """Get all active sessions for the current user."""
    
    auth_service = AuthenticationService(db)
    sessions = await auth_service.get_user_sessions(current_user.id, current_session.id)
    
    return UserSessionsResponse(
        sessions=[
            {
                "id": session.id,
                "device_name": getattr(session, 'device_name', None),
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "is_current": getattr(session, 'is_current', False),
                "last_used_at": session.last_used_at,
                "created_at": session.created_at
            }
            for session in sessions
        ],
        total=len(sessions)
    )


# Revoke Specific Session
@router.delete(
    "/sessions/{session_id}",
    response_model=RevokeSessionResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
        404: {"model": AuthErrorResponse, "description": "Session not found"},
    }
)
async def revoke_user_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a specific user session."""
    
    auth_service = AuthenticationService(db)
    success = await auth_service.revoke_session(session_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return RevokeSessionResponse()


# Revoke All Sessions
@router.delete(
    "/sessions",
    response_model=RevokeAllSessionsResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def revoke_all_user_sessions(
    current_user: User = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
):
    """Revoke all sessions except the current one."""
    
    auth_service = AuthenticationService(db)
    
    # Get all sessions except current
    all_sessions = await auth_service.get_user_sessions(current_user.id, current_session.id)
    other_sessions = [s for s in all_sessions if s.id != current_session.id]
    
    # Revoke other sessions
    revoked_count = 0
    for session in other_sessions:
        if await auth_service.revoke_session(session.id, current_user.id):
            revoked_count += 1
    
    return RevokeAllSessionsResponse(revoked_count=revoked_count)


# Logout
@router.post(
    "/logout",
    response_model=LogoutResponse,
    responses={
        401: {"model": AuthErrorResponse, "description": "Authentication required"},
    }
)
async def logout_user(
    logout_data: LogoutRequest,
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
):
    """Logout user by revoking current session or all sessions."""
    
    auth_service = AuthenticationService(db)
    revoked_count = await auth_service.logout_user(
        current_session.id, 
        logout_data.revoke_all_sessions
    )
    
    return LogoutResponse()


# Health Check
@router.get("/health")
async def auth_health_check():
    """Authentication service health check."""
    return {"status": "healthy", "service": "authentication"}