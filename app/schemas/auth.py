from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


class TokenType(str, Enum):
    """Token type enumeration."""
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


# User Registration Schemas
class UserRegisterRequest(BaseModel):
    """User registration request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    first_name: str = Field(..., min_length=1, max_length=100, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="User last name")
    phone_number: Optional[str] = Field(None, max_length=20, description="User phone number")

    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @validator('phone_number')
    def validate_phone_number(cls, v):
        """Validate phone number format."""
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v


class UserRegisterResponse(BaseModel):
    """User registration response schema."""
    message: str = "User registered successfully"
    user_id: str
    email: str
    verification_required: bool = True


# User Login Schemas
class UserLoginRequest(BaseModel):
    """User login request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    device_name: Optional[str] = Field(None, max_length=100, description="Device name for tracking")
    remember_me: bool = Field(False, description="Remember user for extended session")


class TokenPair(BaseModel):
    """Token pair response schema."""
    access_token: str = Field(..., description="Access token for API authentication")
    refresh_token: str = Field(..., description="Refresh token for token renewal")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


class UserLoginResponse(BaseModel):
    """User login response schema."""
    message: str = "Login successful"
    tokens: TokenPair
    user: "UserProfileResponse"


# Token Refresh Schemas
class TokenRefreshRequest(BaseModel):
    """Token refresh request schema."""
    refresh_token: str = Field(..., description="Refresh token")


class TokenRefreshResponse(BaseModel):
    """Token refresh response schema."""
    access_token: str = Field(..., description="New access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


# Email Verification Schemas
class EmailVerificationRequest(BaseModel):
    """Email verification request schema."""
    token: str = Field(..., description="Email verification token")


class EmailVerificationResponse(BaseModel):
    """Email verification response schema."""
    message: str = "Email verified successfully"
    verified: bool = True


class ResendVerificationRequest(BaseModel):
    """Resend verification email request schema."""
    email: EmailStr = Field(..., description="User email address")


class ResendVerificationResponse(BaseModel):
    """Resend verification email response schema."""
    message: str = "Verification email sent successfully"


# Password Reset Schemas
class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetResponse(BaseModel):
    """Password reset response schema."""
    message: str = "Password reset email sent successfully"


class PasswordResetConfirmRequest(BaseModel):
    """Password reset confirmation request schema."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordResetConfirmResponse(BaseModel):
    """Password reset confirmation response schema."""
    message: str = "Password reset successfully"


# Password Change Schemas
class PasswordChangeRequest(BaseModel):
    """Password change request schema."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordChangeResponse(BaseModel):
    """Password change response schema."""
    message: str = "Password changed successfully"


# User Session Schemas
class UserSessionResponse(BaseModel):
    """User session response schema."""
    id: str
    device_name: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    is_current: bool
    last_used_at: Optional[datetime]
    created_at: datetime


class UserSessionsResponse(BaseModel):
    """User sessions list response schema."""
    sessions: list[UserSessionResponse]
    total: int


class RevokeSessionRequest(BaseModel):
    """Revoke session request schema."""
    session_id: str = Field(..., description="Session ID to revoke")


class RevokeSessionResponse(BaseModel):
    """Revoke session response schema."""
    message: str = "Session revoked successfully"


class RevokeAllSessionsResponse(BaseModel):
    """Revoke all sessions response schema."""
    message: str = "All sessions revoked successfully"
    revoked_count: int


# User Profile Schemas
class UserProfileResponse(BaseModel):
    """User profile response schema."""
    id: str
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str]
    email_verified: bool
    is_active: bool
    stripe_customer_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserProfileUpdateRequest(BaseModel):
    """User profile update request schema."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)

    @validator('phone_number')
    def validate_phone_number(cls, v):
        """Validate phone number format."""
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v


class UserProfileUpdateResponse(BaseModel):
    """User profile update response schema."""
    message: str = "Profile updated successfully"
    user: UserProfileResponse


# Logout Schemas
class LogoutRequest(BaseModel):
    """Logout request schema."""
    revoke_all_sessions: bool = Field(False, description="Revoke all user sessions")


class LogoutResponse(BaseModel):
    """Logout response schema."""
    message: str = "Logged out successfully"


# JWT Token Payload Schemas
class TokenPayload(BaseModel):
    """JWT token payload schema."""
    sub: str  # User ID
    email: str
    token_type: TokenType
    session_id: Optional[str] = None
    exp: int
    iat: int


class AccessTokenPayload(TokenPayload):
    """Access token payload schema."""
    token_type: TokenType = TokenType.ACCESS
    session_id: str


class RefreshTokenPayload(TokenPayload):
    """Refresh token payload schema."""
    token_type: TokenType = TokenType.REFRESH
    session_id: str


class EmailVerificationTokenPayload(TokenPayload):
    """Email verification token payload schema."""
    token_type: TokenType = TokenType.EMAIL_VERIFICATION


class PasswordResetTokenPayload(TokenPayload):
    """Password reset token payload schema."""
    token_type: TokenType = TokenType.PASSWORD_RESET


# Error Response Schemas
class AuthErrorResponse(BaseModel):
    """Authentication error response schema."""
    error: str
    message: str
    details: Optional[dict] = None


class ValidationErrorResponse(BaseModel):
    """Validation error response schema."""
    error: str = "validation_error"
    message: str
    details: list[dict]


# Rate Limiting Schemas
class RateLimitResponse(BaseModel):
    """Rate limit response schema."""
    error: str = "rate_limit_exceeded"
    message: str = "Too many requests"
    retry_after: int  # Seconds until retry is allowed


# Device Information Schema
class DeviceInfo(BaseModel):
    """Device information schema."""
    device_name: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_fingerprint: Optional[str] = None


# Update UserLoginResponse to avoid circular import
UserLoginResponse.model_rebuild()