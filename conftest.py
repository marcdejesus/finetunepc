"""Global pytest configuration and fixtures."""

import asyncio
import pytest
from typing import AsyncGenerator, Generator
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient

try:
    from httpx import AsyncClient
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    AsyncClient = None

try:
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    AsyncSession = None

# Try to import app components
try:
    from app.main import app
    from app.core.database import get_db, Base
    from app.models import User, UserSession
    APP_AVAILABLE = True
except ImportError:
    APP_AVAILABLE = False
    app = None


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Clean up
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session with transaction rollback."""
    
    # Create session factory
    async_session_factory = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_factory() as session:
        # Start a transaction
        transaction = await session.begin()
        
        try:
            yield session
        finally:
            # Rollback transaction to clean up
            await transaction.rollback()
            await session.close()


@pytest.fixture
def override_get_db(db_session: AsyncSession):
    """Override the get_db dependency for testing."""
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(override_get_db) -> Generator[TestClient, None, None]:
    """Create a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    settings = get_settings()
    settings.secret_key = "test-secret-key-for-testing-only"
    settings.database_url = TEST_DATABASE_URL
    return settings


@pytest.fixture
def mock_stripe():
    """Mock Stripe client."""
    mock = Mock()
    mock.Customer = Mock()
    mock.Customer.create = Mock(return_value={"id": "cus_test123"})
    mock.Customer.retrieve = Mock(return_value={"id": "cus_test123", "email": "test@example.com"})
    mock.PaymentIntent = Mock()
    mock.PaymentIntent.create = Mock(return_value={"id": "pi_test123", "client_secret": "pi_test123_secret"})
    return mock


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    mock = AsyncMock()
    mock.send_verification_email = AsyncMock(return_value=True)
    mock.send_password_reset_email = AsyncMock(return_value=True)
    mock.send_order_confirmation_email = AsyncMock(return_value=True)
    return mock


@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing."""
    mock = Mock()
    mock.is_allowed = Mock(return_value=True)
    mock.get_retry_after = Mock(return_value=0)
    mock.reset_attempts = Mock()
    return mock


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


# Test data fixtures
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
def sample_product_data():
    """Sample product data."""
    return {
        "name": "Test Product",
        "description": "A test product description",
        "price": "99.99",
        "sku": "TEST-001",
        "category_id": None,
        "is_active": True,
        "weight": "1.5",
        "dimensions": {"length": 10, "width": 5, "height": 3}
    }


@pytest.fixture
def sample_category_data():
    """Sample category data."""
    return {
        "name": "Test Category",
        "description": "A test category",
        "slug": "test-category",
        "is_active": True,
        "parent_id": None
    }


# Authentication helpers
@pytest.fixture
async def authenticated_user(db_session: AsyncSession, sample_user_data):
    """Create an authenticated user for testing."""
    from app.services.auth_service import AuthenticationService
    from app.schemas.auth import UserRegisterRequest, DeviceInfo
    
    auth_service = AuthenticationService(db_session)
    register_data = UserRegisterRequest(**sample_user_data)
    device_info = DeviceInfo(ip_address="127.0.0.1", user_agent="test-agent")
    
    user, _ = await auth_service.register_user(register_data, device_info.ip_address)
    user.email_verified = True  # Skip email verification for tests
    await db_session.commit()
    
    return user


@pytest.fixture
async def auth_headers(authenticated_user, db_session: AsyncSession):
    """Create authentication headers for API requests."""
    from app.services.auth_service import AuthenticationService
    from app.schemas.auth import UserLoginRequest, DeviceInfo
    
    auth_service = AuthenticationService(db_session)
    login_data = UserLoginRequest(
        email=authenticated_user.email,
        password="TestPassword123!",
        remember_me=False
    )
    device_info = DeviceInfo(ip_address="127.0.0.1", user_agent="test-agent")
    
    _, tokens, _ = await auth_service.authenticate_user(login_data, device_info)
    
    return {"Authorization": f"Bearer {tokens.access_token}"}


# Database cleanup helpers
@pytest.fixture(autouse=True)
async def cleanup_database(db_session: AsyncSession):
    """Clean up database after each test."""
    yield
    # Cleanup is handled by transaction rollback in db_session fixture


# Async test configuration
pytest_plugins = ('pytest_asyncio',)