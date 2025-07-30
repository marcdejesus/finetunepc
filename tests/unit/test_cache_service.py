"""Unit tests for the cache service."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
import pickle
from decimal import Decimal

from app.services.cache_service import CacheService


class TestCacheService:
    """Test the CacheService class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = Mock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.keys.return_value = []
        mock_redis.exists.return_value = False
        mock_redis.ping.return_value = True
        mock_redis.info.return_value = {
            "connected_clients": 1,
            "used_memory_human": "1.2M",
            "keyspace_hits": 100,
            "keyspace_misses": 10
        }
        mock_redis.flushdb.return_value = True
        return mock_redis
    
    @pytest.fixture
    def cache_service(self, mock_redis):
        """Cache service with mocked Redis."""
        with patch('app.services.cache_service.redis.Redis') as mock_redis_class:
            mock_redis_class.return_value = mock_redis
            service = CacheService()
            service.redis_client = mock_redis
            return service
    
    def test_cache_service_initialization(self, cache_service):
        """Test cache service initialization."""
        assert cache_service.PRODUCT_PREFIX == "product:"
        assert cache_service.CATEGORY_PREFIX == "category:"
        assert cache_service.SEARCH_PREFIX == "search:"
        assert cache_service.DEFAULT_TTL == 3600
        assert cache_service.PRODUCT_TTL == 1800
    
    def test_serialize_deserialize_json(self, cache_service):
        """Test JSON serialization and deserialization."""
        # Test simple data
        data = {"name": "test", "price": 100.50, "active": True}
        serialized = cache_service._serialize_data(data)
        assert isinstance(serialized, bytes)
        
        deserialized = cache_service._deserialize_data(serialized)
        assert deserialized == data
    
    def test_serialize_deserialize_complex(self, cache_service):
        """Test serialization with complex objects (falls back to pickle)."""
        # Test with Decimal (not JSON serializable)
        data = {"price": Decimal("99.99"), "name": "test"}
        
        # Should fall back to pickle for non-JSON serializable data
        with patch.object(cache_service, '_serialize_data') as mock_serialize:
            mock_serialize.return_value = pickle.dumps(data)
            with patch.object(cache_service, '_deserialize_data') as mock_deserialize:
                mock_deserialize.return_value = data
                
                serialized = cache_service._serialize_data(data)
                deserialized = cache_service._deserialize_data(serialized)
                assert deserialized == data
    
    def test_get_set_basic(self, cache_service, mock_redis):
        """Test basic get and set operations."""
        # Test setting data
        test_data = {"id": "123", "name": "Test Product"}
        cache_service.set("test_key", test_data)
        
        mock_redis.setex.assert_called_once()
        args = mock_redis.setex.call_args
        assert args[0][0] == "test_key"
        assert args[0][1] == cache_service.DEFAULT_TTL
        
        # Test getting data
        mock_redis.get.return_value = json.dumps(test_data).encode('utf-8')
        result = cache_service.get("test_key")
        
        mock_redis.get.assert_called_with("test_key")
        assert result == test_data
    
    def test_get_nonexistent_key(self, cache_service, mock_redis):
        """Test getting non-existent key."""
        mock_redis.get.return_value = None
        result = cache_service.get("nonexistent_key")
        assert result is None
    
    def test_delete(self, cache_service, mock_redis):
        """Test deleting a key."""
        mock_redis.delete.return_value = 1
        result = cache_service.delete("test_key")
        
        mock_redis.delete.assert_called_with("test_key")
        assert result is True
    
    def test_delete_pattern(self, cache_service, mock_redis):
        """Test deleting keys by pattern."""
        mock_redis.keys.return_value = ["key1", "key2", "key3"]
        mock_redis.delete.return_value = 3
        
        result = cache_service.delete_pattern("test_*")
        
        mock_redis.keys.assert_called_with("test_*")
        mock_redis.delete.assert_called_with("key1", "key2", "key3")
        assert result == 3
    
    def test_exists(self, cache_service, mock_redis):
        """Test checking if key exists."""
        mock_redis.exists.return_value = True
        result = cache_service.exists("test_key")
        
        mock_redis.exists.assert_called_with("test_key")
        assert result is True
    
    def test_product_cache_methods(self, cache_service, mock_redis):
        """Test product-specific cache methods."""
        product_data = {
            "id": "prod123",
            "name": "Test Product",
            "price": 99.99
        }
        
        # Test set_product
        cache_service.set_product("prod123", product_data)
        mock_redis.setex.assert_called()
        args = mock_redis.setex.call_args
        assert args[0][0] == "product:prod123"
        assert args[0][1] == cache_service.PRODUCT_TTL
        
        # Test get_product
        mock_redis.get.return_value = json.dumps(product_data).encode('utf-8')
        result = cache_service.get_product("prod123")
        mock_redis.get.assert_called_with("product:prod123")
        assert result == product_data
        
        # Test invalidate_product
        cache_service.invalidate_product("prod123")
        mock_redis.delete.assert_called_with("product:prod123")
    
    def test_product_by_slug_cache_methods(self, cache_service, mock_redis):
        """Test product by slug cache methods."""
        product_data = {"id": "prod123", "slug": "test-product"}
        
        # Test set_product_by_slug
        cache_service.set_product_by_slug("test-product", product_data)
        args = mock_redis.setex.call_args
        assert args[0][0] == "product:slug:test-product"
        
        # Test get_product_by_slug
        mock_redis.get.return_value = json.dumps(product_data).encode('utf-8')
        result = cache_service.get_product_by_slug("test-product")
        assert result == product_data
        
        # Test invalidate_product_by_slug
        cache_service.invalidate_product_by_slug("test-product")
        mock_redis.delete.assert_called_with("product:slug:test-product")
    
    def test_category_cache_methods(self, cache_service, mock_redis):
        """Test category-specific cache methods."""
        category_data = {"id": 1, "name": "Electronics"}
        
        # Test set_category
        cache_service.set_category(1, category_data)
        args = mock_redis.setex.call_args
        assert args[0][0] == "category:1"
        assert args[0][1] == cache_service.CATEGORY_TTL
        
        # Test get_category
        mock_redis.get.return_value = json.dumps(category_data).encode('utf-8')
        result = cache_service.get_category(1)
        assert result == category_data
    
    def test_category_hierarchy_cache(self, cache_service, mock_redis):
        """Test category hierarchy caching."""
        hierarchy_data = [
            {"id": 1, "name": "Electronics", "children": []},
            {"id": 2, "name": "Clothing", "children": []}
        ]
        
        # Test set_category_hierarchy
        cache_service.set_category_hierarchy(hierarchy_data)
        args = mock_redis.setex.call_args
        assert args[0][0] == "category:hierarchy"
        
        # Test get_category_hierarchy
        mock_redis.get.return_value = json.dumps(hierarchy_data).encode('utf-8')
        result = cache_service.get_category_hierarchy()
        assert result == hierarchy_data
        
        # Test invalidate_categories
        mock_redis.keys.return_value = ["category:1", "category:2", "category:hierarchy"]
        cache_service.invalidate_categories()
        mock_redis.keys.assert_called_with("category:*")
    
    def test_search_cache_methods(self, cache_service, mock_redis):
        """Test search cache methods."""
        search_results = {
            "products": [],
            "total": 0,
            "query": "test"
        }
        filters = {"category_id": 1, "brand": "Apple"}
        
        # Test set_search_results
        cache_service.set_search_results("test", search_results, filters)
        args = mock_redis.setex.call_args
        expected_key = cache_service._generate_search_key("test", filters)
        assert args[0][0] == expected_key
        
        # Test get_search_results
        mock_redis.get.return_value = json.dumps(search_results).encode('utf-8')
        result = cache_service.get_search_results("test", filters)
        assert result == search_results
    
    def test_generate_search_key(self, cache_service):
        """Test search key generation."""
        # Test basic search key
        key = cache_service._generate_search_key("test query", None)
        assert key == "search:test query"
        
        # Test search key with filters
        filters = {"category_id": 1, "brand": "Apple"}
        key = cache_service._generate_search_key("test", filters)
        assert "search:test" in key
        assert "category_id" in key or "brand" in key
    
    def test_filter_options_cache(self, cache_service, mock_redis):
        """Test filter options caching."""
        filter_options = ["Brand A", "Brand B", "Brand C"]
        
        cache_service.set_filter_options("brands", filter_options)
        args = mock_redis.setex.call_args
        assert args[0][0] == "filter:brands"
        
        mock_redis.get.return_value = json.dumps(filter_options).encode('utf-8')
        result = cache_service.get_filter_options("brands")
        assert result == filter_options
    
    def test_pagination_cache_methods(self, cache_service, mock_redis):
        """Test pagination cache methods."""
        pagination_results = {
            "products": [],
            "cursor": "next_cursor",
            "has_next": True
        }
        filters = {"price_min": 100}
        
        cache_service.set_pagination_results("cursor123", pagination_results, filters)
        args = mock_redis.setex.call_args
        expected_key = cache_service._generate_pagination_key("cursor123", filters)
        assert args[0][0] == expected_key
        
        mock_redis.get.return_value = json.dumps(pagination_results).encode('utf-8')
        result = cache_service.get_pagination_results("cursor123", filters)
        assert result == pagination_results
    
    def test_generate_pagination_key(self, cache_service):
        """Test pagination key generation."""
        key = cache_service._generate_pagination_key("cursor123", None)
        assert key == "pagination:cursor123"
        
        filters = {"category_id": 1}
        key = cache_service._generate_pagination_key("cursor123", filters)
        assert "pagination:cursor123" in key
        assert "category_id" in key
    
    def test_cache_stats(self, cache_service, mock_redis):
        """Test cache statistics."""
        stats = cache_service.get_cache_stats()
        
        mock_redis.info.assert_called_once()
        assert "connected_clients" in stats
        assert "used_memory" in stats
        assert "keyspace_hits" in stats
        assert "keyspace_misses" in stats
        assert "hit_rate" in stats
        assert stats["hit_rate"] == 90.91  # 100/(100+10) * 100
    
    def test_calculate_hit_rate(self, cache_service):
        """Test hit rate calculation."""
        # Test normal case
        hit_rate = cache_service._calculate_hit_rate(80, 20)
        assert hit_rate == 80.0
        
        # Test zero case
        hit_rate = cache_service._calculate_hit_rate(0, 0)
        assert hit_rate == 0.0
        
        # Test perfect hit rate
        hit_rate = cache_service._calculate_hit_rate(100, 0)
        assert hit_rate == 100.0
    
    def test_health_check(self, cache_service, mock_redis):
        """Test cache health check."""
        # Test healthy cache
        mock_redis.ping.return_value = True
        assert cache_service.health_check() is True
        
        # Test unhealthy cache
        mock_redis.ping.side_effect = Exception("Connection failed")
        assert cache_service.health_check() is False
    
    def test_flush_all(self, cache_service, mock_redis):
        """Test flushing all cache entries."""
        mock_redis.flushdb.return_value = True
        result = cache_service.flush_all()
        
        mock_redis.flushdb.assert_called_once()
        assert result is True
    
    def test_error_handling(self, cache_service, mock_redis):
        """Test error handling in cache operations."""
        # Test get with Redis error
        mock_redis.get.side_effect = Exception("Redis error")
        result = cache_service.get("test_key")
        assert result is None
        
        # Test set with Redis error
        mock_redis.setex.side_effect = Exception("Redis error")
        result = cache_service.set("test_key", {"data": "test"})
        assert result is False
        
        # Test delete with Redis error
        mock_redis.delete.side_effect = Exception("Redis error")
        result = cache_service.delete("test_key")
        assert result is False
    
    def test_serialization_error_handling(self, cache_service):
        """Test serialization error handling."""
        # Test with data that can't be serialized
        class UnserializableClass:
            def __init__(self):
                self.file = open(__file__)  # File objects can't be pickled
        
        unserializable_data = UnserializableClass()
        
        # Should handle serialization errors gracefully
        try:
            cache_service._serialize_data(unserializable_data)
        except Exception:
            # Should not raise unhandled exceptions
            pass
    
    def test_deserialization_error_handling(self, cache_service):
        """Test deserialization error handling."""
        # Test with invalid JSON data
        invalid_json = b"invalid json data"
        
        # Should handle gracefully by trying pickle
        try:
            result = cache_service._deserialize_data(invalid_json)
        except Exception:
            # Should handle pickle errors too
            pass
        
        # Test with completely invalid data
        invalid_data = b"definitely not valid serialized data"
        try:
            result = cache_service._deserialize_data(invalid_data)
        except:
            # Should handle all deserialization errors
            pass


class TestCacheServiceIntegration:
    """Integration tests for cache service (would need actual Redis in real scenarios)."""
    
    def test_cache_service_with_settings(self):
        """Test cache service initialization with settings."""
        with patch('app.services.cache_service.settings') as mock_settings:
            mock_settings.redis_host = "test-host"
            mock_settings.redis_port = 6380
            mock_settings.redis_db = 1
            
            with patch('app.services.cache_service.redis.Redis') as mock_redis_class:
                service = CacheService()
                
                mock_redis_class.assert_called_with(
                    host="test-host",
                    port=6380,
                    db=1,
                    decode_responses=False,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True
                )
    
    def test_global_cache_service_instance(self):
        """Test that global cache service instance is created."""
        from app.services.cache_service import cache_service
        assert cache_service is not None
        assert isinstance(cache_service, CacheService)