"""Unit tests for user CRUD operations."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from fastapi import HTTPException

from app.crud.crud_user import CRUDUser
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserPasswordChange
from tests.fixtures.factories import UserFactory


class TestCRUDUser:
    """Test the CRUDUser class."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.add = Mock()
        return db
    
    @pytest.fixture
    def crud_user(self):
        """CRUDUser instance."""
        return CRUDUser(User)
    
    @pytest.fixture
    def sample_user(self):
        """Sample user for testing."""
        return UserFactory.build()
    
    @pytest.fixture
    def sample_user_create(self):
        """Sample UserCreate schema."""
        return UserCreate(
            email="test@example.com",
            password="TestPassword123!",
            first_name="John",
            last_name="Doe",
            phone_number="+1234567890"
        )
    
    @pytest.fixture
    def sample_user_update(self):
        """Sample UserUpdate schema."""
        return UserUpdate(
            first_name="Jane",
            last_name="Smith",
            phone_number="+9876543210"
        )
    
    @pytest.fixture
    def sample_password_change(self):
        """Sample UserPasswordChange schema."""
        return UserPasswordChange(
            current_password="OldPassword123!",
            new_password="NewPassword123!",
            confirm_password="NewPassword123!"
        )

    async def test_get_by_email(self, crud_user, mock_db_session, sample_user):
        """Test getting user by email."""
        # Mock the database result
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_user.get_by_email(mock_db_session, email=sample_user.email)
        
        assert result == sample_user
        mock_db_session.execute.assert_called_once()

    async def test_get_by_email_not_found(self, crud_user, mock_db_session):
        """Test getting user by email when not found."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_user.get_by_email(mock_db_session, email="notfound@example.com")
        
        assert result is None

    async def test_get_by_email_excludes_deleted(self, crud_user, mock_db_session):
        """Test that get_by_email excludes deleted users."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        await crud_user.get_by_email(mock_db_session, email="test@example.com")
        
        # Verify the query includes deleted_at filter
        call_args = mock_db_session.execute.call_args[0][0]
        # Check that the query contains the deleted_at filter
        assert "deleted_at" in str(call_args)

    async def test_get_active_by_email(self, crud_user, mock_db_session, sample_user):
        """Test getting active user by email."""
        sample_user.is_active = True
        sample_user.deleted_at = None
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_user.get_active_by_email(mock_db_session, email=sample_user.email)
        
        assert result == sample_user
        mock_db_session.execute.assert_called_once()

    async def test_get_active_by_email_excludes_inactive(self, crud_user, mock_db_session):
        """Test that get_active_by_email excludes inactive users."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        await crud_user.get_active_by_email(mock_db_session, email="test@example.com")
        
        # Verify the query includes is_active and deleted_at filters
        call_args = mock_db_session.execute.call_args[0][0]
        query_str = str(call_args)
        assert "is_active" in query_str
        assert "deleted_at" in query_str

    async def test_create_user(self, crud_user, mock_db_session, sample_user_create):
        """Test creating a new user."""
        mock_request = Mock()
        
        with patch('app.crud.crud_user.get_password_hash') as mock_hash, \
             patch('app.services.audit_service.AuditService.log_user_registration') as mock_audit, \
             patch('app.crud.crud_user.User') as mock_user_class:
            
            # Setup mocks
            mock_hash.return_value = "hashed_password"
            mock_user_instance = Mock(spec=User)
            mock_user_instance.id = "user123"
            mock_user_class.return_value = mock_user_instance
            mock_audit.return_value = Mock()
            
            result = await crud_user.create(
                mock_db_session,
                obj_in=sample_user_create,
                request=mock_request
            )
            
            # Verify user creation
            mock_user_class.assert_called_once_with(
                email=sample_user_create.email,
                hashed_password="hashed_password",
                first_name=sample_user_create.first_name,
                last_name=sample_user_create.last_name,
                phone_number=sample_user_create.phone_number,
                is_active=True,
                email_verified=False
            )
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(mock_user_instance)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(mock_user_instance)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == mock_user_instance

    async def test_update_profile(self, crud_user, mock_db_session, sample_user, sample_user_update):
        """Test updating user profile."""
        mock_request = Mock()
        
        with patch('app.services.audit_service.AuditService.log_user_profile_update') as mock_audit, \
             patch('app.crud.crud_user.User') as mock_user_class:
            
            mock_audit.return_value = Mock()
            
            result = await crud_user.update_profile(
                mock_db_session,
                db_obj=sample_user,
                obj_in=sample_user_update,
                request=mock_request
            )
            
            # Verify user fields were updated
            assert sample_user.first_name == sample_user_update.first_name
            assert sample_user.last_name == sample_user_update.last_name
            assert sample_user.phone_number == sample_user_update.phone_number
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user

    async def test_change_password_success(self, crud_user, mock_db_session, sample_user, sample_password_change):
        """Test successful password change."""
        mock_request = Mock()
        
        with patch('app.crud.crud_user.verify_password') as mock_verify, \
             patch('app.crud.crud_user.get_password_hash') as mock_hash, \
             patch('app.services.audit_service.AuditService.log_password_change') as mock_audit:
            
            # Setup mocks
            mock_verify.return_value = True
            mock_hash.return_value = "new_hashed_password"
            mock_audit.return_value = Mock()
            
            result = await crud_user.change_password(
                mock_db_session,
                user=sample_user,
                password_data=sample_password_change,
                request=mock_request
            )
            
            # Verify password verification
            mock_verify.assert_called_once_with(
                sample_password_change.current_password,
                sample_user.hashed_password
            )
            
            # Verify password hashing
            mock_hash.assert_called_once_with(sample_password_change.new_password)
            
            # Verify password was updated
            assert sample_user.hashed_password == "new_hashed_password"
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user

    async def test_change_password_wrong_current_password(self, crud_user, mock_db_session, sample_user, sample_password_change):
        """Test password change with wrong current password."""
        with patch('app.crud.crud_user.verify_password') as mock_verify:
            mock_verify.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await crud_user.change_password(
                    mock_db_session,
                    user=sample_user,
                    password_data=sample_password_change
                )
            
            assert exc_info.value.status_code == 400
            assert "Current password is incorrect" in str(exc_info.value.detail)

    async def test_soft_delete(self, crud_user, mock_db_session, sample_user):
        """Test soft deleting a user."""
        mock_request = Mock()
        deleted_by_user_id = "admin123"
        
        with patch.object(crud_user, 'get') as mock_get, \
             patch('app.services.audit_service.AuditService.log_user_deletion') as mock_audit, \
             patch('app.crud.crud_user.datetime') as mock_datetime:
            
            # Setup mocks
            mock_get.return_value = sample_user
            mock_audit.return_value = Mock()
            mock_now = datetime(2023, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = mock_now
            
            result = await crud_user.soft_delete(
                mock_db_session,
                user_id=sample_user.id,
                deleted_by_user_id=deleted_by_user_id,
                request=mock_request
            )
            
            # Verify user was soft deleted
            assert sample_user.deleted_at == mock_now
            assert sample_user.is_active is False
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user

    async def test_soft_delete_user_not_found(self, crud_user, mock_db_session):
        """Test soft deleting a user that doesn't exist."""
        with patch.object(crud_user, 'get') as mock_get:
            mock_get.return_value = None
            
            result = await crud_user.soft_delete(
                mock_db_session,
                user_id="nonexistent",
                deleted_by_user_id="admin123"
            )
            
            assert result is None

    async def test_soft_delete_already_deleted_user(self, crud_user, mock_db_session, sample_user):
        """Test soft deleting a user that's already deleted."""
        sample_user.deleted_at = datetime.utcnow()
        
        with patch.object(crud_user, 'get') as mock_get:
            mock_get.return_value = sample_user
            
            result = await crud_user.soft_delete(
                mock_db_session,
                user_id=sample_user.id,
                deleted_by_user_id="admin123"
            )
            
            assert result is None

    async def test_authenticate_success(self, crud_user, mock_db_session, sample_user):
        """Test successful user authentication."""
        with patch.object(crud_user, 'get_active_by_email') as mock_get, \
             patch('app.crud.crud_user.verify_password') as mock_verify:
            
            mock_get.return_value = sample_user
            mock_verify.return_value = True
            
            result = await crud_user.authenticate(
                mock_db_session,
                email=sample_user.email,
                password="correct_password"
            )
            
            assert result == sample_user
            mock_get.assert_called_once_with(mock_db_session, email=sample_user.email)
            mock_verify.assert_called_once()

    async def test_authenticate_user_not_found(self, crud_user, mock_db_session):
        """Test authentication when user doesn't exist."""
        with patch.object(crud_user, 'get_active_by_email') as mock_get:
            mock_get.return_value = None
            
            result = await crud_user.authenticate(
                mock_db_session,
                email="notfound@example.com",
                password="password"
            )
            
            assert result is None

    async def test_authenticate_wrong_password(self, crud_user, mock_db_session, sample_user):
        """Test authentication with wrong password."""
        with patch.object(crud_user, 'get_active_by_email') as mock_get, \
             patch('app.crud.crud_user.verify_password') as mock_verify:
            
            mock_get.return_value = sample_user
            mock_verify.return_value = False
            
            result = await crud_user.authenticate(
                mock_db_session,
                email=sample_user.email,
                password="wrong_password"
            )
            
            assert result is None

    async def test_is_active(self, crud_user, sample_user):
        """Test is_active method."""
        # Test active user
        sample_user.is_active = True
        sample_user.deleted_at = None
        assert await crud_user.is_active(sample_user) is True
        
        # Test inactive user
        sample_user.is_active = False
        assert await crud_user.is_active(sample_user) is False
        
        # Test deleted user
        sample_user.is_active = True
        sample_user.deleted_at = datetime.utcnow()
        assert await crud_user.is_active(sample_user) is False

    async def test_is_superuser(self, crud_user, sample_user):
        """Test is_superuser method."""
        sample_user.is_superuser = False
        assert await crud_user.is_superuser(sample_user) is False
        
        sample_user.is_superuser = True
        assert await crud_user.is_superuser(sample_user) is True

    async def test_verify_email(self, crud_user, mock_db_session, sample_user):
        """Test email verification."""
        mock_request = Mock()
        sample_user.email_verified = False
        
        with patch('app.services.audit_service.AuditService.log_change') as mock_audit:
            mock_audit.return_value = Mock()
            
            result = await crud_user.verify_email(
                mock_db_session,
                user=sample_user,
                request=mock_request
            )
            
            # Verify email was marked as verified
            assert sample_user.email_verified is True
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user

    async def test_activate_user(self, crud_user, mock_db_session, sample_user):
        """Test activating a user."""
        mock_request = Mock()
        activated_by_user_id = "admin123"
        sample_user.is_active = False
        sample_user.deleted_at = datetime.utcnow()
        
        with patch('app.services.audit_service.AuditService.log_change') as mock_audit:
            mock_audit.return_value = Mock()
            
            result = await crud_user.activate_user(
                mock_db_session,
                user=sample_user,
                activated_by_user_id=activated_by_user_id,
                request=mock_request
            )
            
            # Verify user was activated
            assert sample_user.is_active is True
            assert sample_user.deleted_at is None
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user

    async def test_deactivate_user(self, crud_user, mock_db_session, sample_user):
        """Test deactivating a user."""
        mock_request = Mock()
        deactivated_by_user_id = "admin123"
        sample_user.is_active = True
        
        with patch('app.services.audit_service.AuditService.log_change') as mock_audit:
            mock_audit.return_value = Mock()
            
            result = await crud_user.deactivate_user(
                mock_db_session,
                user=sample_user,
                deactivated_by_user_id=deactivated_by_user_id,
                request=mock_request
            )
            
            # Verify user was deactivated
            assert sample_user.is_active is False
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_user)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_user)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_user