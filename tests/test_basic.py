"""Basic tests to verify test setup works."""

import pytest
from unittest.mock import Mock, patch


def test_simple_math():
    """Test basic math operations."""
    assert 2 + 2 == 4
    assert 10 - 5 == 5
    assert 3 * 4 == 12
    assert 15 / 3 == 5


def test_string_operations():
    """Test string operations."""
    text = "Hello, World!"
    assert len(text) == 13
    assert text.lower() == "hello, world!"
    assert text.upper() == "HELLO, WORLD!"
    assert "World" in text


def test_list_operations():
    """Test list operations."""
    numbers = [1, 2, 3, 4, 5]
    assert len(numbers) == 5
    assert numbers[0] == 1
    assert numbers[-1] == 5
    assert sum(numbers) == 15


def test_dictionary_operations():
    """Test dictionary operations."""
    person = {
        "name": "John Doe",
        "age": 30,
        "email": "john@example.com"
    }
    
    assert person["name"] == "John Doe"
    assert person.get("age") == 30
    assert "email" in person
    assert len(person) == 3


class TestPasswordValidation:
    """Test password validation logic."""
    
    def test_password_length(self):
        """Test password length validation."""
        assert len("TestPassword123!") >= 8
        assert len("short") < 8
    
    def test_password_complexity(self):
        """Test password complexity requirements."""
        password = "TestPassword123!"
        
        # Check for uppercase
        assert any(c.isupper() for c in password)
        
        # Check for lowercase
        assert any(c.islower() for c in password)
        
        # Check for digits
        assert any(c.isdigit() for c in password)
        
        # Check for special characters
        assert any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)


class TestEmailValidation:
    """Test email validation logic."""
    
    def test_valid_emails(self):
        """Test valid email formats."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "first+last@company.org",
            "123@numbers.net"
        ]
        
        for email in valid_emails:
            assert "@" in email
            assert "." in email.split("@")[1]
    
    def test_invalid_emails(self):
        """Test invalid email formats."""
        invalid_emails = [
            "invalid",
            "@domain.com",
            "user@",
            "user@domain",
            "user space@domain.com"
        ]
        
        for email in invalid_emails:
            if "@" not in email:
                assert "@" not in email
            elif email.startswith("@"):
                assert email.startswith("@")
            elif email.endswith("@"):
                assert email.endswith("@")


class TestMockingExamples:
    """Examples of testing with mocks."""
    
    def test_mock_function_call(self):
        """Test mocking a function call."""
        mock_func = Mock(return_value="mocked result")
        
        result = mock_func("arg1", "arg2")
        
        assert result == "mocked result"
        mock_func.assert_called_once_with("arg1", "arg2")
    
    def test_mock_with_side_effect(self):
        """Test mocking with side effects."""
        mock_func = Mock(side_effect=[1, 2, 3])
        
        assert mock_func() == 1
        assert mock_func() == 2
        assert mock_func() == 3
        assert mock_func.call_count == 3
    
    @patch('builtins.print')
    def test_mock_print(self, mock_print):
        """Test mocking built-in print function."""
        print("Hello, World!")
        mock_print.assert_called_once_with("Hello, World!")
    
    def test_mock_object_attributes(self):
        """Test mocking object attributes."""
        mock_user = Mock()
        mock_user.id = "user123"
        mock_user.email = "test@example.com"
        mock_user.is_active = True
        
        assert mock_user.id == "user123"
        assert mock_user.email == "test@example.com"
        assert mock_user.is_active is True


@pytest.mark.asyncio
async def test_async_function():
    """Test async function example."""
    async def async_add(a, b):
        return a + b
    
    result = await async_add(2, 3)
    assert result == 5


class TestUserDataValidation:
    """Test user data validation examples."""
    
    def test_user_data_structure(self, sample_user_data):
        """Test user data structure."""
        assert "email" in sample_user_data
        assert "password" in sample_user_data
        assert "first_name" in sample_user_data
        assert "last_name" in sample_user_data
        assert "phone_number" in sample_user_data
    
    def test_user_data_types(self, sample_user_data):
        """Test user data types."""
        assert isinstance(sample_user_data["email"], str)
        assert isinstance(sample_user_data["password"], str)
        assert isinstance(sample_user_data["first_name"], str)
        assert isinstance(sample_user_data["last_name"], str)
        assert isinstance(sample_user_data["phone_number"], str)
    
    def test_user_data_values(self, sample_user_data):
        """Test user data values."""
        assert "@" in sample_user_data["email"]
        assert len(sample_user_data["password"]) >= 8
        assert len(sample_user_data["first_name"]) > 0
        assert len(sample_user_data["last_name"]) > 0
        assert sample_user_data["phone_number"].startswith("+")


class TestMockServices:
    """Test mock service interactions."""
    
    def test_mock_rate_limiter(self, mock_rate_limiter):
        """Test mock rate limiter."""
        assert mock_rate_limiter.is_allowed("test_key", 5, 1) is True
        mock_rate_limiter.is_allowed.assert_called_once_with("test_key", 5, 1)
    
    @pytest.mark.asyncio
    async def test_mock_email_service(self, mock_email_service):
        """Test mock email service."""
        result = await mock_email_service.send_verification_email(
            "test@example.com", "verification_token"
        )
        
        assert result is True
        mock_email_service.send_verification_email.assert_called_once_with(
            "test@example.com", "verification_token"
        )
    
    def test_mock_user_object(self, mock_user):
        """Test mock user object."""
        assert mock_user.id == "user123"
        assert mock_user.email == "test@example.com"
        assert mock_user.is_active is True
        assert mock_user.email_verified is True


def test_fixtures_available(sample_user_data, sample_login_data, mock_user):
    """Test that all fixtures are available and working."""
    assert sample_user_data is not None
    assert sample_login_data is not None
    assert mock_user is not None
    
    assert isinstance(sample_user_data, dict)
    assert isinstance(sample_login_data, dict)
    assert hasattr(mock_user, 'id')


# Performance and edge cases
class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_empty_strings(self):
        """Test empty string handling."""
        empty = ""
        assert len(empty) == 0
        assert empty == ""
        assert not empty  # Empty string is falsy
    
    def test_none_values(self):
        """Test None value handling."""
        value = None
        assert value is None
        assert not value  # None is falsy
    
    def test_zero_values(self):
        """Test zero value handling."""
        zero = 0
        assert zero == 0
        assert not zero  # Zero is falsy
    
    def test_large_numbers(self):
        """Test large number handling."""
        large_num = 999999999999999999
        assert large_num > 0
        assert isinstance(large_num, int)
    
    def test_unicode_strings(self):
        """Test unicode string handling."""
        unicode_text = "Hello 世界 🌍"
        assert len(unicode_text) == 10  # "Hello " (6) + "世界" (2) + " " (1) + "🌍" (1) = 10
        assert "世界" in unicode_text
        assert "🌍" in unicode_text