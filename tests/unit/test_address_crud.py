"""Unit tests for address CRUD operations."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from app.crud.crud_address import CRUDAddress
from app.models.address import Address, AddressType
from app.schemas.user import AddressCreate, AddressUpdate
from tests.fixtures.factories import AddressFactory, UserFactory


class TestCRUDAddress:
    """Test the CRUDAddress class."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        db = AsyncMock()
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.add = Mock()
        db.delete = AsyncMock()
        return db
    
    @pytest.fixture
    def crud_address(self):
        """CRUDAddress instance."""
        return CRUDAddress(Address)
    
    @pytest.fixture
    def sample_user(self):
        """Sample user for testing."""
        return UserFactory.build()
    
    @pytest.fixture
    def sample_address(self):
        """Sample address for testing."""
        return AddressFactory.build()
    
    @pytest.fixture
    def sample_address_create(self):
        """Sample AddressCreate schema."""
        return AddressCreate(
            address_type="shipping",
            first_name="John",
            last_name="Doe",
            company="Test Company",
            address_line_1="123 Main St",
            address_line_2="Apt 4B",
            city="New York",
            state_province="NY",
            postal_code="10001",
            country="US",
            phone_number="+1234567890"
        )
    
    @pytest.fixture
    def sample_address_update(self):
        """Sample AddressUpdate schema."""
        return AddressUpdate(
            first_name="Jane",
            last_name="Smith",
            address_line_1="456 Oak Ave",
            city="Boston",
            state_province="MA",
            postal_code="02101"
        )

    async def test_get_by_user(self, crud_address, mock_db_session, sample_user):
        """Test getting addresses for a user."""
        sample_addresses = [AddressFactory.build(), AddressFactory.build()]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_addresses
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.get_by_user(
            mock_db_session,
            user_id=sample_user.id,
            skip=0,
            limit=100
        )
        
        assert result == sample_addresses
        mock_db_session.execute.assert_called_once()

    async def test_get_by_user_with_address_type_filter(self, crud_address, mock_db_session, sample_user):
        """Test getting addresses for a user with address type filter."""
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result
        
        await crud_address.get_by_user(
            mock_db_session,
            user_id=sample_user.id,
            address_type="billing",
            skip=0,
            limit=10
        )
        
        # Verify query was executed
        mock_db_session.execute.assert_called_once()
        
        # Check that the query includes address type filter
        call_args = mock_db_session.execute.call_args[0][0]
        # The query should contain address type filtering logic
        assert "address_type" in str(call_args)

    async def test_get_by_user_with_both_address_type(self, crud_address, mock_db_session, sample_user):
        """Test getting addresses for a user with 'both' address type filter."""
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result
        
        await crud_address.get_by_user(
            mock_db_session,
            user_id=sample_user.id,
            address_type="both",
            skip=0,
            limit=10
        )
        
        mock_db_session.execute.assert_called_once()

    async def test_count_by_user(self, crud_address, mock_db_session, sample_user):
        """Test counting addresses for a user."""
        mock_result = Mock()
        mock_result.scalar_one.return_value = 5
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.count_by_user(
            mock_db_session,
            user_id=sample_user.id
        )
        
        assert result == 5
        mock_db_session.execute.assert_called_once()

    async def test_count_by_user_with_filter(self, crud_address, mock_db_session, sample_user):
        """Test counting addresses for a user with type filter."""
        mock_result = Mock()
        mock_result.scalar_one.return_value = 2
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.count_by_user(
            mock_db_session,
            user_id=sample_user.id,
            address_type="shipping"
        )
        
        assert result == 2
        mock_db_session.execute.assert_called_once()

    async def test_get_user_address(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test getting a specific user address."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_address
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.get_user_address(
            mock_db_session,
            address_id=sample_address.id,
            user_id=sample_user.id
        )
        
        assert result == sample_address
        mock_db_session.execute.assert_called_once()

    async def test_get_user_address_not_found(self, crud_address, mock_db_session, sample_user):
        """Test getting a user address that doesn't exist."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.get_user_address(
            mock_db_session,
            address_id="nonexistent",
            user_id=sample_user.id
        )
        
        assert result is None

    async def test_create_for_user(self, crud_address, mock_db_session, sample_user, sample_address_create):
        """Test creating an address for a user."""
        mock_request = Mock()
        
        with patch('app.crud.crud_address.Address') as mock_address_class, \
             patch('app.services.audit_service.AuditService.log_address_action') as mock_audit, \
             patch('app.services.audit_service.AuditService.extract_model_values') as mock_extract:
            
            # Setup mocks
            mock_address_instance = Mock(spec=Address)
            mock_address_instance.id = "addr123"
            mock_address_class.return_value = mock_address_instance
            mock_audit.return_value = Mock()
            mock_extract.return_value = {"id": "addr123", "address_line_1": "123 Main St"}
            
            result = await crud_address.create_for_user(
                mock_db_session,
                obj_in=sample_address_create,
                user_id=sample_user.id,
                request=mock_request
            )
            
            # Verify address creation
            mock_address_class.assert_called_once_with(
                user_id=sample_user.id,
                address_type=AddressType.SHIPPING,
                first_name=sample_address_create.first_name,
                last_name=sample_address_create.last_name,
                company=sample_address_create.company,
                address_line_1=sample_address_create.address_line_1,
                address_line_2=sample_address_create.address_line_2,
                city=sample_address_create.city,
                state_province=sample_address_create.state_province,
                postal_code=sample_address_create.postal_code,
                country="US",  # Should be uppercased
                phone_number=sample_address_create.phone_number,
                is_default=False
            )
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(mock_address_instance)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(mock_address_instance)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == mock_address_instance

    async def test_update_user_address(self, crud_address, mock_db_session, sample_address, sample_address_update):
        """Test updating a user address."""
        mock_request = Mock()
        
        with patch('app.services.audit_service.AuditService.log_address_action') as mock_audit, \
             patch('app.services.audit_service.AuditService.extract_model_values') as mock_extract:
            
            mock_audit.return_value = Mock()
            mock_extract.side_effect = [
                {"id": "addr123", "first_name": "John"},  # old values
                {"id": "addr123", "first_name": "Jane"}   # new values
            ]
            
            result = await crud_address.update_user_address(
                mock_db_session,
                db_obj=sample_address,
                obj_in=sample_address_update,
                request=mock_request
            )
            
            # Verify address fields were updated
            assert sample_address.first_name == sample_address_update.first_name
            assert sample_address.last_name == sample_address_update.last_name
            assert sample_address.address_line_1 == sample_address_update.address_line_1
            assert sample_address.city == sample_address_update.city
            assert sample_address.state_province == sample_address_update.state_province
            assert sample_address.postal_code == sample_address_update.postal_code
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_address)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_address)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_address

    async def test_update_user_address_with_address_type(self, crud_address, mock_db_session, sample_address):
        """Test updating address with address type conversion."""
        address_update = AddressUpdate(address_type="billing")
        
        with patch('app.services.audit_service.AuditService.log_address_action') as mock_audit, \
             patch('app.services.audit_service.AuditService.extract_model_values') as mock_extract:
            
            mock_audit.return_value = Mock()
            mock_extract.side_effect = [
                {"address_type": "shipping"},
                {"address_type": "billing"}
            ]
            
            result = await crud_address.update_user_address(
                mock_db_session,
                db_obj=sample_address,
                obj_in=address_update
            )
            
            # Verify address type was converted to enum
            assert sample_address.address_type == AddressType.BILLING

    async def test_update_user_address_with_country_normalization(self, crud_address, mock_db_session, sample_address):
        """Test updating address with country code normalization."""
        address_update = AddressUpdate(country="ca")  # lowercase
        
        with patch('app.services.audit_service.AuditService.log_address_action') as mock_audit, \
             patch('app.services.audit_service.AuditService.extract_model_values') as mock_extract:
            
            mock_audit.return_value = Mock()
            mock_extract.side_effect = [
                {"country": "US"},
                {"country": "CA"}
            ]
            
            await crud_address.update_user_address(
                mock_db_session,
                db_obj=sample_address,
                obj_in=address_update
            )
            
            # Verify country was normalized to uppercase
            assert sample_address.country == "CA"

    async def test_delete_user_address(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test deleting a user address."""
        mock_request = Mock()
        
        with patch.object(crud_address, 'get_user_address') as mock_get, \
             patch('app.services.audit_service.AuditService.log_address_action') as mock_audit, \
             patch('app.services.audit_service.AuditService.extract_model_values') as mock_extract:
            
            mock_get.return_value = sample_address
            mock_audit.return_value = Mock()
            mock_extract.return_value = {"id": "addr123", "address_line_1": "123 Main St"}
            
            result = await crud_address.delete_user_address(
                mock_db_session,
                address_id=sample_address.id,
                user_id=sample_user.id,
                request=mock_request
            )
            
            # Verify address was deleted
            mock_db_session.delete.assert_called_once_with(sample_address)
            mock_db_session.commit.assert_called_once()
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_address

    async def test_delete_user_address_not_found(self, crud_address, mock_db_session, sample_user):
        """Test deleting a user address that doesn't exist."""
        with patch.object(crud_address, 'get_user_address') as mock_get:
            mock_get.return_value = None
            
            result = await crud_address.delete_user_address(
                mock_db_session,
                address_id="nonexistent",
                user_id=sample_user.id
            )
            
            assert result is None

    async def test_set_default_address(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test setting an address as default."""
        mock_request = Mock()
        sample_address.address_type = AddressType.SHIPPING
        
        with patch.object(crud_address, 'get_user_address') as mock_get, \
             patch('app.services.audit_service.AuditService.log_address_action') as mock_audit:
            
            mock_get.return_value = sample_address
            mock_audit.return_value = Mock()
            
            result = await crud_address.set_default_address(
                mock_db_session,
                address_id=sample_address.id,
                user_id=sample_user.id,
                request=mock_request
            )
            
            # Verify address was set as default
            assert sample_address.is_default is True
            
            # Verify database operations
            mock_db_session.execute.assert_called()  # For unsetting other defaults
            mock_db_session.add.assert_called_once_with(sample_address)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_address)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_address

    async def test_set_default_address_with_specific_type(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test setting an address as default for a specific type."""
        sample_address.address_type = AddressType.BOTH
        
        with patch.object(crud_address, 'get_user_address') as mock_get, \
             patch('app.services.audit_service.AuditService.log_address_action') as mock_audit:
            
            mock_get.return_value = sample_address
            mock_audit.return_value = Mock()
            
            result = await crud_address.set_default_address(
                mock_db_session,
                address_id=sample_address.id,
                user_id=sample_user.id,
                address_type="billing"
            )
            
            assert result == sample_address

    async def test_set_default_address_incompatible_type(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test setting an address as default for an incompatible type."""
        sample_address.address_type = AddressType.SHIPPING
        
        with patch.object(crud_address, 'get_user_address') as mock_get:
            mock_get.return_value = sample_address
            
            with pytest.raises(ValueError) as exc_info:
                await crud_address.set_default_address(
                    mock_db_session,
                    address_id=sample_address.id,
                    user_id=sample_user.id,
                    address_type="billing"
                )
            
            assert "cannot be used for billing purposes" in str(exc_info.value)

    async def test_set_default_address_not_found(self, crud_address, mock_db_session, sample_user):
        """Test setting a default address that doesn't exist."""
        with patch.object(crud_address, 'get_user_address') as mock_get:
            mock_get.return_value = None
            
            result = await crud_address.set_default_address(
                mock_db_session,
                address_id="nonexistent",
                user_id=sample_user.id
            )
            
            assert result is None

    async def test_get_default_address(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test getting the default address for a user."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_address
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.get_default_address(
            mock_db_session,
            user_id=sample_user.id,
            address_type="shipping"
        )
        
        assert result == sample_address
        mock_db_session.execute.assert_called_once()

    async def test_get_default_address_not_found(self, crud_address, mock_db_session, sample_user):
        """Test getting default address when none exists."""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        result = await crud_address.get_default_address(
            mock_db_session,
            user_id=sample_user.id,
            address_type="billing"
        )
        
        assert result is None

    async def test_verify_address(self, crud_address, mock_db_session, sample_user, sample_address):
        """Test verifying an address."""
        mock_request = Mock()
        sample_address.is_verified = False
        
        with patch.object(crud_address, 'get_user_address') as mock_get, \
             patch('app.services.audit_service.AuditService.log_address_action') as mock_audit:
            
            mock_get.return_value = sample_address
            mock_audit.return_value = Mock()
            
            result = await crud_address.verify_address(
                mock_db_session,
                address_id=sample_address.id,
                user_id=sample_user.id,
                request=mock_request
            )
            
            # Verify address was marked as verified
            assert sample_address.is_verified is True
            
            # Verify database operations
            mock_db_session.add.assert_called_once_with(sample_address)
            mock_db_session.commit.assert_called_once()
            mock_db_session.refresh.assert_called_once_with(sample_address)
            
            # Verify audit logging
            mock_audit.assert_called_once()
            
            assert result == sample_address

    async def test_verify_address_not_found(self, crud_address, mock_db_session, sample_user):
        """Test verifying an address that doesn't exist."""
        with patch.object(crud_address, 'get_user_address') as mock_get:
            mock_get.return_value = None
            
            result = await crud_address.verify_address(
                mock_db_session,
                address_id="nonexistent",
                user_id=sample_user.id
            )
            
            assert result is None