from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field, validator
from app.core.security import PasswordManager


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password_strength(cls, v):
        if not PasswordManager.is_password_strong(v):
            raise ValueError(
                'Password must be at least 8 characters long and contain '
                'uppercase, lowercase, digit, and special character'
            )
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    
    class Config:
        # Ensure we don't allow email updates through profile update
        extra = "forbid"


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('new_password')
    def validate_new_password_strength(cls, v):
        if not PasswordManager.is_password_strong(v):
            raise ValueError(
                'Password must be at least 8 characters long and contain '
                'uppercase, lowercase, digit, and special character'
            )
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: str
    email_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserInDBBase(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email_verified: bool = False
    is_active: bool = True
    is_superuser: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class User(UserInDBBase):
    """User response schema without sensitive data."""
    pass


class UserInDB(UserInDBBase):
    """User schema with sensitive data for internal use."""
    hashed_password: str
    stripe_customer_id: Optional[str] = None


# Address-related schemas
class AddressBase(BaseModel):
    address_type: str = Field(..., description="Address type: billing, shipping, or both")
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    company: Optional[str] = Field(None, max_length=200)
    address_line_1: str = Field(..., max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: str = Field(..., max_length=20)
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")
    phone_number: Optional[str] = Field(None, max_length=20)


class AddressCreate(AddressBase):
    @validator('address_type')
    def validate_address_type(cls, v):
        valid_types = ['billing', 'shipping', 'both']
        if v.lower() not in valid_types:
            raise ValueError(f'Address type must be one of: {", ".join(valid_types)}')
        return v.lower()
    
    @validator('country')
    def validate_country_code(cls, v):
        # Basic validation - in production you might want to use a proper country code library
        if len(v) != 2 or not v.isalpha():
            raise ValueError('Country must be a valid 2-letter ISO code')
        return v.upper()


class AddressUpdate(BaseModel):
    address_type: Optional[str] = None
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=200)
    address_line_1: Optional[str] = Field(None, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    phone_number: Optional[str] = Field(None, max_length=20)
    
    @validator('address_type')
    def validate_address_type(cls, v):
        if v is not None:
            valid_types = ['billing', 'shipping', 'both']
            if v.lower() not in valid_types:
                raise ValueError(f'Address type must be one of: {", ".join(valid_types)}')
            return v.lower()
        return v
    
    @validator('country')
    def validate_country_code(cls, v):
        if v is not None:
            if len(v) != 2 or not v.isalpha():
                raise ValueError('Country must be a valid 2-letter ISO code')
            return v.upper()
        return v


class AddressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    address_type: str
    first_name: str
    last_name: str
    company: Optional[str] = None
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    postal_code: str
    country: str
    phone_number: Optional[str] = None
    is_default: bool = False
    is_verified: bool = False
    full_name: str
    full_address: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AddressListResponse(BaseModel):
    addresses: List[AddressResponse]
    total: int
    page: int
    size: int
    pages: int


# Audit logging schema
class AuditLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None