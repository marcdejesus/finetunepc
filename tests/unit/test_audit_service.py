"""Unit tests for the AuditService."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from fastapi import Request

from app.services.audit_service import AuditService
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.address import Address
from tests.fixtures.factories import UserFactory, AddressFactory


class TestAuditService:
    """Test the AuditService class."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        db = AsyncMock()
        db.add = Mock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        return db
    
    @pytest.fixture
    def mock_request(self):
        """Mock FastAPI request object."""
        request = Mock(spec=Request)
        request.client = Mock()
        request.client.host = "192.168.1.1"
        request.headers = {"user-agent": "Mozilla/5.0 Test Browser"}
        return request
    
    @pytest.fixture
    def sample_user(self):
        """Sample user for testing."""
        return UserFactory.build()
    
    @pytest.fixture
    def sample_address(self):
        """Sample address for testing."""
        return AddressFactory.build()

    @pytest.mark.asyncio
    async def test_log_change_basic(self, mock_db_session):
        """Test basic audit log creation."""
        user_id = "user123"
        action = "update_profile"
        resource_type = "user"
        resource_id = "user123"
        old_values = {"name": "Old Name"}
        new_values = {"name": "New Name"}
        
        # Mock the AuditLog constructor to return a mock instance
        with patch('app.services.audit_service.AuditLog') as mock_audit_log_class:
            mock_audit_log_instance = Mock(spec=AuditLog)
            mock_audit_log_class.return_value = mock_audit_log_instance
            
            result = await AuditService.log_change(
                db=mock_db_session,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                old_values=old_values,
                new_values=new_values
            )
            
            # Verify AuditLog was created with correct parameters
            mock_audit_log_class.assert_called_once_with(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                old_values=old_values,
                new_values=new_values,
                ip_address=None,
                user_agent=None
            )
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(mock_audit_log_instance)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(mock_audit_log_instance)
            
            assert result == mock_audit_log_instance

    @pytest.mark.asyncio
    async def test_log_change_with_request(self, mock_db_session, mock_request):
        """Test audit log creation with request data."""
        user_id = "user123"
        action = "login"
        resource_type = "user_session"
        resource_id = "session123"
        
        with patch('app.services.audit_service.AuditLog') as mock_audit_log_class:
            mock_audit_log_instance = Mock(spec=AuditLog)
            mock_audit_log_class.return_value = mock_audit_log_instance
            
            result = await AuditService.log_change(
                db=mock_db_session,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                request=mock_request
            )
            
            # Verify request data was extracted
            mock_audit_log_class.assert_called_once_with(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                old_values=None,
                new_values=None,
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0 Test Browser"
            )

    def test_extract_model_values(self, sample_user):
        """Test extracting values from a model instance."""
        values = AuditService.extract_model_values(sample_user)
        
        # Should include most fields
        assert "id" in values
        assert "email" in values
        assert "first_name" in values
        assert "last_name" in values
        assert "is_active" in values
        
        # Should exclude sensitive fields
        assert "hashed_password" not in values
        assert "created_at" not in values  # Excluded by default
        assert "updated_at" not in values  # Excluded by default

    def test_extract_model_values_with_custom_exclusions(self, sample_user):
        """Test extracting values with custom exclusions."""
        exclude_fields = {"email", "phone_number"}
        values = AuditService.extract_model_values(sample_user, exclude_fields)
        
        # Should exclude custom fields
        assert "email" not in values
        assert "phone_number" not in values
        
        # Should still include other fields
        assert "id" in values
        assert "first_name" in values

    def test_extract_schema_values(self):
        """Test extracting values from a Pydantic schema."""
        from app.schemas.user import UserUpdate
        
        schema = UserUpdate(
            first_name="John",
            last_name="Doe",
            phone_number="+1234567890"
        )
        
        values = AuditService.extract_schema_values(schema)
        
        assert values["first_name"] == "John"
        assert values["last_name"] == "Doe"
        assert values["phone_number"] == "+1234567890"

    def test_extract_schema_values_with_exclusions(self):
        """Test extracting schema values with exclusions."""
        from app.schemas.user import UserPasswordChange
        
        schema = UserPasswordChange(
            current_password="oldpass123",
            new_password="NewPass123!",
            confirm_password="NewPass123!"
        )
        
        values = AuditService.extract_schema_values(schema)
        
        # Should exclude password fields by default
        assert "current_password" not in values
        assert "new_password" not in values
        assert "confirm_password" not in values

    @pytest.mark.asyncio
    async def test_log_user_profile_update(self, mock_db_session, sample_user, mock_request):
        """Test logging user profile updates."""
        updated_values = {"first_name": "NewName", "phone_number": "+9876543210"}
        
        with patch.object(AuditService, 'extract_model_values') as mock_extract_model, \
             patch.object(AuditService, 'log_change') as mock_log_change:
            
            mock_extract_model.return_value = {
                "id": sample_user.id,
                "email": sample_user.email,
                "first_name": "OldName",
                "phone_number": "+1234567890"
            }
            
            mock_audit_log = Mock(spec=AuditLog)
            mock_log_change.return_value = mock_audit_log
            
            result = await AuditService.log_user_profile_update(
                db=mock_db_session,
                user_id=sample_user.id,
                old_user=sample_user,
                updated_values=updated_values,
                request=mock_request
            )
            
            # Verify extract_model_values was called
            mock_extract_model.assert_called_once_with(sample_user)
            
            # Verify log_change was called with correct parameters
            mock_log_change.assert_called_once_with(
                db=mock_db_session,
                user_id=sample_user.id,
                action="update_profile",
                resource_type="user",
                resource_id=sample_user.id,
                old_values=mock_extract_model.return_value,
                new_values={"first_name": "NewName", "phone_number": "+9876543210"},
                request=mock_request
            )
            
            assert result == mock_audit_log

    @pytest.mark.asyncio
    async def test_log_password_change(self, mock_db_session, mock_request):
        """Test logging password changes."""
        user_id = "user123"
        
        with patch.object(AuditService, 'log_change') as mock_log_change, \
             patch('app.services.audit_service.datetime') as mock_datetime:
            
            mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T00:00:00"
            mock_audit_log = Mock(spec=AuditLog)
            mock_log_change.return_value = mock_audit_log
            
            result = await AuditService.log_password_change(
                db=mock_db_session,
                user_id=user_id,
                request=mock_request
            )
            
            # Verify log_change was called correctly
            mock_log_change.assert_called_once_with(
                db=mock_db_session,
                user_id=user_id,
                action="change_password",
                resource_type="user",
                resource_id=user_id,
                old_values={"action": "password_changed"},
                new_values={"timestamp": "2023-01-01T00:00:00"},
                request=mock_request
            )
            
            assert result == mock_audit_log

    @pytest.mark.asyncio
    async def test_log_address_action(self, mock_db_session, mock_request):
        """Test logging address-related actions."""
        user_id = "user123"
        address_id = "addr123"
        action = "create"
        old_values = None
        new_values = {"address_line_1": "123 Main St"}
        
        with patch.object(AuditService, 'log_change') as mock_log_change:
            mock_audit_log = Mock(spec=AuditLog)
            mock_log_change.return_value = mock_audit_log
            
            result = await AuditService.log_address_action(
                db=mock_db_session,
                user_id=user_id,
                action=action,
                address_id=address_id,
                old_values=old_values,
                new_values=new_values,
                request=mock_request
            )
            
            # Verify log_change was called with correct parameters
            mock_log_change.assert_called_once_with(
                db=mock_db_session,
                user_id=user_id,
                action="address_create",
                resource_type="address",
                resource_id=address_id,
                old_values=old_values,
                new_values=new_values,
                request=mock_request
            )
            
            assert result == mock_audit_log

    @pytest.mark.asyncio
    async def test_log_user_registration(self, mock_db_session, mock_request):
        """Test logging user registration."""
        user_id = "user123"
        user_data = {
            "email": "test@example.com",
            "first_name": "John",
            "password": "secret123",  # Should be removed
            "hashed_password": "hashed_secret"  # Should be removed
        }
        
        with patch.object(AuditService, 'log_change') as mock_log_change:
            mock_audit_log = Mock(spec=AuditLog)
            mock_log_change.return_value = mock_audit_log
            
            result = await AuditService.log_user_registration(
                db=mock_db_session,
                user_id=user_id,
                user_data=user_data,
                request=mock_request
            )
            
            # Verify sensitive data was removed
            expected_safe_data = {
                "email": "test@example.com",
                "first_name": "John"
            }
            
            mock_log_change.assert_called_once_with(
                db=mock_db_session,
                user_id=user_id,
                action="register",
                resource_type="user",
                resource_id=user_id,
                old_values=None,
                new_values=expected_safe_data,
                request=mock_request
            )
            
            assert result == mock_audit_log

    @pytest.mark.asyncio
    async def test_log_user_deletion(self, mock_db_session, mock_request):
        """Test logging user deletion."""
        user_id = "user123"
        deleted_by_user_id = "admin456"
        
        with patch.object(AuditService, 'log_change') as mock_log_change, \
             patch('app.services.audit_service.datetime') as mock_datetime:
            
            mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T00:00:00"
            mock_audit_log = Mock(spec=AuditLog)
            mock_log_change.return_value = mock_audit_log
            
            result = await AuditService.log_user_deletion(
                db=mock_db_session,
                user_id=user_id,
                deleted_by_user_id=deleted_by_user_id,
                request=mock_request
            )
            
            # Verify log_change was called correctly
            mock_log_change.assert_called_once_with(
                db=mock_db_session,
                user_id=deleted_by_user_id,  # Note: logged by the admin who deleted
                action="soft_delete",
                resource_type="user",
                resource_id=user_id,
                old_values={"status": "active"},
                new_values={"status": "deleted", "deleted_at": "2023-01-01T00:00:00"},
                request=mock_request
            )
            
            assert result == mock_audit_log

    def test_datetime_serialization_in_extract_model_values(self, sample_user):
        """Test that datetime objects are properly serialized to ISO format."""
        # Test that datetime fields are properly converted to ISO format
        exclude_fields = {"hashed_password", "updated_at"}  # Exclude optional fields
        
        values = AuditService.extract_model_values(sample_user, exclude_fields)
        
        # Should include created_at field and it should be a string (ISO format)
        assert "created_at" in values
        assert isinstance(values["created_at"], str)
        
        # Verify it looks like an ISO timestamp
        import re
        iso_pattern = r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?'
        assert re.match(iso_pattern, values["created_at"])
        
        # Test with None datetime value
        assert "deleted_at" in values
        assert values["deleted_at"] is None  # Should handle None values

    @pytest.mark.asyncio
    async def test_log_change_without_request_client(self, mock_db_session):
        """Test audit log creation when request.client is None."""
        mock_request = Mock(spec=Request)
        mock_request.client = None
        mock_request.headers = {"user-agent": "Test Browser"}
        
        with patch('app.services.audit_service.AuditLog') as mock_audit_log_class:
            mock_audit_log_instance = Mock(spec=AuditLog)
            mock_audit_log_class.return_value = mock_audit_log_instance
            
            await AuditService.log_change(
                db=mock_db_session,
                user_id="user123",
                action="test",
                resource_type="test",
                resource_id="test123",
                request=mock_request
            )
            
            # Should handle None client gracefully
            mock_audit_log_class.assert_called_once_with(
                user_id="user123",
                action="test",
                resource_type="test",
                resource_id="test123",
                old_values=None,
                new_values=None,
                ip_address=None,  # Should be None when client is None
                user_agent="Test Browser"
            )