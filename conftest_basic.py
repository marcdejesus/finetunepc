"""Simple pytest configuration for basic testing."""

import pytest
from typing import Generator
from unittest.mock import Mock, AsyncMock


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    return AsyncMock()


@pytest.fixture
def mock_user():
    """Mock user object."""
    mock = Mock()
    mock.id = "user123"
    mock.email = "test@example.com"
    mock.first_name = "Test"
    mock.last_name = "User"
    mock.is_active = True
    mock.email_verified = True
    mock.hashed_password = "hashed_password"
    return mock


@pytest.fixture
def sample_user_data():
    """Sample user registration data."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+1234567890"
    }


@pytest.fixture
def sample_login_data():
    """Sample login data."""
    return {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "remember_me": False
    }


@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing."""
    mock = Mock()
    mock.is_allowed = Mock(return_value=True)
    mock.get_retry_after = Mock(return_value=0)
    mock.reset_attempts = Mock()
    return mock


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    mock = AsyncMock()
    mock.send_verification_email = AsyncMock(return_value=True)
    mock.send_password_reset_email = AsyncMock(return_value=True)
    mock.send_order_confirmation_email = AsyncMock(return_value=True)
    return mock