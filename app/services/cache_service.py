"""Redis caching service for product catalog optimization."""

import json
import pickle
from typing import Any, Optional, Dict, List, Union
from datetime import timedelta
import redis
from app.core.config import settings


class CacheService:
    """Redis-based caching service for product catalog."""
    
    def __init__(self):
        """Initialize Redis connection."""
        self.redis_client = redis.Redis(
            host=getattr(settings, 'redis_host', 'localhost'),
            port=getattr(settings, 'redis_port', 6379),
            db=getattr(settings, 'redis_db', 0),
            decode_responses=False,  # Keep binary for pickle
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True
        )
        
        # Cache prefixes for different data types
        self.PRODUCT_PREFIX = "product:"
        self.CATEGORY_PREFIX = "category:"
        self.SEARCH_PREFIX = "search:"
        self.FILTER_PREFIX = "filter:"
        self.PAGINATION_PREFIX = "pagination:"
        
        # Default cache durations
        self.DEFAULT_TTL = 3600  # 1 hour
        self.PRODUCT_TTL = 1800  # 30 minutes
        self.CATEGORY_TTL = 7200  # 2 hours
        self.SEARCH_TTL = 900    # 15 minutes
        self.FILTER_TTL = 600    # 10 minutes

    def _serialize_data(self, data: Any) -> bytes:
        """Serialize data for storage in Redis."""
        try:
            # Try JSON first for simple data
            return json.dumps(data, default=str).encode('utf-8')
        except (TypeError, ValueError):
            # Fall back to pickle for complex objects
            return pickle.dumps(data)

    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data from Redis."""
        try:
            # Try JSON first
            return json.loads(data.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to pickle
            return pickle.loads(data)

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            data = self.redis_client.get(key)
            if data is None:
                return None
            return self._deserialize_data(data)
        except (redis.RedisError, pickle.PickleError, json.JSONDecodeError) as e:
            print(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL."""
        try:
            serialized_data = self._serialize_data(value)
            ttl = ttl or self.DEFAULT_TTL
            return self.redis_client.setex(key, ttl, serialized_data)
        except (redis.RedisError, pickle.PickleError, json.JSONEncodeError) as e:
            print(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            return bool(self.redis_client.delete(key))
        except redis.RedisError as e:
            print(f"Cache delete error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except redis.RedisError as e:
            print(f"Cache delete pattern error for pattern {pattern}: {e}")
            return 0

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.redis_client.exists(key))
        except redis.RedisError as e:
            print(f"Cache exists error for key {key}: {e}")
            return False

    # Product-specific cache methods
    def get_product(self, product_id: str) -> Optional[Dict]:
        """Get product from cache."""
        key = f"{self.PRODUCT_PREFIX}{product_id}"
        return self.get(key)

    def set_product(self, product_id: str, product_data: Dict, ttl: Optional[int] = None) -> bool:
        """Cache product data."""
        key = f"{self.PRODUCT_PREFIX}{product_id}"
        return self.set(key, product_data, ttl or self.PRODUCT_TTL)

    def invalidate_product(self, product_id: str) -> bool:
        """Remove product from cache."""
        key = f"{self.PRODUCT_PREFIX}{product_id}"
        return self.delete(key)

    def get_product_by_slug(self, slug: str) -> Optional[Dict]:
        """Get product by slug from cache."""
        key = f"{self.PRODUCT_PREFIX}slug:{slug}"
        return self.get(key)

    def set_product_by_slug(self, slug: str, product_data: Dict, ttl: Optional[int] = None) -> bool:
        """Cache product data by slug."""
        key = f"{self.PRODUCT_PREFIX}slug:{slug}"
        return self.set(key, product_data, ttl or self.PRODUCT_TTL)

    def invalidate_product_by_slug(self, slug: str) -> bool:
        """Remove product by slug from cache."""
        key = f"{self.PRODUCT_PREFIX}slug:{slug}"
        return self.delete(key)

    # Category-specific cache methods
    def get_category(self, category_id: int) -> Optional[Dict]:
        """Get category from cache."""
        key = f"{self.CATEGORY_PREFIX}{category_id}"
        return self.get(key)

    def set_category(self, category_id: int, category_data: Dict, ttl: Optional[int] = None) -> bool:
        """Cache category data."""
        key = f"{self.CATEGORY_PREFIX}{category_id}"
        return self.set(key, category_data, ttl or self.CATEGORY_TTL)

    def get_category_hierarchy(self) -> Optional[List]:
        """Get category hierarchy from cache."""
        key = f"{self.CATEGORY_PREFIX}hierarchy"
        return self.get(key)

    def set_category_hierarchy(self, hierarchy_data: List, ttl: Optional[int] = None) -> bool:
        """Cache category hierarchy."""
        key = f"{self.CATEGORY_PREFIX}hierarchy"
        return self.set(key, hierarchy_data, ttl or self.CATEGORY_TTL)

    def invalidate_categories(self) -> int:
        """Remove all category cache entries."""
        pattern = f"{self.CATEGORY_PREFIX}*"
        return self.delete_pattern(pattern)

    # Search cache methods
    def get_search_results(self, search_query: str, filters: Dict = None) -> Optional[Dict]:
        """Get search results from cache."""
        cache_key = self._generate_search_key(search_query, filters)
        return self.get(cache_key)

    def set_search_results(self, search_query: str, results: Dict, filters: Dict = None, ttl: Optional[int] = None) -> bool:
        """Cache search results."""
        cache_key = self._generate_search_key(search_query, filters)
        return self.set(cache_key, results, ttl or self.SEARCH_TTL)

    def _generate_search_key(self, search_query: str, filters: Dict = None) -> str:
        """Generate cache key for search results."""
        key_parts = [self.SEARCH_PREFIX, search_query.lower()]
        if filters:
            # Sort filters for consistent cache keys
            filter_str = json.dumps(filters, sort_keys=True)
            key_parts.append(filter_str)
        return ":".join(key_parts)

    # Filter cache methods
    def get_filter_options(self, filter_type: str) -> Optional[List]:
        """Get filter options from cache (e.g., brands, attributes)."""
        key = f"{self.FILTER_PREFIX}{filter_type}"
        return self.get(key)

    def set_filter_options(self, filter_type: str, options: List, ttl: Optional[int] = None) -> bool:
        """Cache filter options."""
        key = f"{self.FILTER_PREFIX}{filter_type}"
        return self.set(key, options, ttl or self.FILTER_TTL)

    # Pagination cache methods
    def get_pagination_results(self, cursor: str, filters: Dict = None) -> Optional[Dict]:
        """Get paginated results from cache."""
        cache_key = self._generate_pagination_key(cursor, filters)
        return self.get(cache_key)

    def set_pagination_results(self, cursor: str, results: Dict, filters: Dict = None, ttl: Optional[int] = None) -> bool:
        """Cache paginated results."""
        cache_key = self._generate_pagination_key(cursor, filters)
        return self.set(cache_key, results, ttl or self.FILTER_TTL)

    def _generate_pagination_key(self, cursor: str, filters: Dict = None) -> str:
        """Generate cache key for pagination results."""
        key_parts = [self.PAGINATION_PREFIX, cursor]
        if filters:
            filter_str = json.dumps(filters, sort_keys=True)
            key_parts.append(filter_str)
        return ":".join(key_parts)

    # Cache warming methods
    def warm_product_cache(self, product_ids: List[str]) -> None:
        """Pre-warm cache for multiple products (to be implemented with product service)."""
        # This would be implemented with the product service
        pass

    def warm_category_cache(self) -> None:
        """Pre-warm category cache (to be implemented with category service)."""
        # This would be implemented with the category service
        pass

    # Cache statistics and health
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            info = self.redis_client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info.get("keyspace_hits", 0), info.get("keyspace_misses", 0))
            }
        except redis.RedisError:
            return {"error": "Could not retrieve cache stats"}

    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate."""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)

    def health_check(self) -> bool:
        """Check if Redis is healthy."""
        try:
            return self.redis_client.ping()
        except redis.RedisError:
            return False

    def flush_all(self) -> bool:
        """Clear all cache entries (use with caution)."""
        try:
            return self.redis_client.flushdb()
        except redis.RedisError as e:
            print(f"Cache flush error: {e}")
            return False


# Global cache service instance
cache_service = CacheService()