"""Unit tests for the search service."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.search_service import SearchService, search_service
from app.schemas.product import ProductFilters, SortOrder, PriceRange


class TestSearchService:
    """Test the SearchService class."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        return db
    
    @pytest.fixture
    def search_svc(self):
        """Search service instance."""
        return SearchService()
    
    def test_search_service_initialization(self, search_svc):
        """Test search service initialization."""
        assert search_svc.default_rank_weights == "A=1.0,B=0.4,C=0.2,D=0.1"
        assert isinstance(search_svc, SearchService)
    
    def test_build_search_query_basic(self, search_svc):
        """Test building basic search query."""
        query = search_svc._build_search_query(
            query="test product",
            filters=None,
            sort_by=SortOrder.CREATED_DESC
        )
        
        assert isinstance(query, str)
        assert "to_tsvector" in query
        assert "plainto_tsquery" in query
        assert "search_rank" in query
        assert "ORDER BY" in query
    
    def test_build_search_query_with_filters(self, search_svc):
        """Test building search query with filters."""
        filters = ProductFilters(
            category_id=1,
            brand="Apple",
            price_range=PriceRange(min_price=100, max_price=500),
            is_featured=True,
            in_stock=True
        )
        
        query = search_svc._build_search_query(
            query="iPhone",
            filters=filters,
            sort_by=SortOrder.PRICE_ASC
        )
        
        assert "category_id = :category_id" in query
        assert "brand ILIKE :brand_filter" in query
        assert "min_price >= :min_price" in query
        assert "max_price <= :max_price" in query
        assert "is_featured = :is_featured" in query
        assert "in_stock = true" in query
    
    def test_build_search_query_empty_query(self, search_svc):
        """Test building search query with empty search string."""
        query = search_svc._build_search_query(
            query="",
            filters=None,
            sort_by=SortOrder.CREATED_DESC
        )
        
        # Should not include search conditions for empty query
        assert "plainto_tsquery" not in query
        assert "search_rank" in query  # Still calculate rank for consistency
    
    def test_get_order_clause(self, search_svc):
        """Test getting order clauses for different sort orders."""
        # Test price ascending
        order = search_svc._get_order_clause(SortOrder.PRICE_ASC, False)
        assert "min_price ASC" in order
        
        # Test price descending
        order = search_svc._get_order_clause(SortOrder.PRICE_DESC, False)
        assert "max_price DESC" in order
        
        # Test name ascending
        order = search_svc._get_order_clause(SortOrder.NAME_ASC, False)
        assert "p.name ASC" in order
        
        # Test name descending
        order = search_svc._get_order_clause(SortOrder.NAME_DESC, False)
        assert "p.name DESC" in order
        
        # Test created date ascending
        order = search_svc._get_order_clause(SortOrder.CREATED_ASC, False)
        assert "p.created_at ASC" in order
        
        # Test created date descending
        order = search_svc._get_order_clause(SortOrder.CREATED_DESC, False)
        assert "p.created_at DESC" in order
        
        # Test popularity
        order = search_svc._get_order_clause(SortOrder.POPULARITY_DESC, False)
        assert "popularity DESC" in order
        
        # Test with search query (should prioritize search ranking)
        order = search_svc._get_order_clause(SortOrder.CREATED_DESC, True)
        assert "search_rank DESC" in order
    
    def test_generate_search_cache_key(self, search_svc):
        """Test generating cache keys for search results."""
        # Basic search key
        key = search_svc._generate_search_cache_key(
            query="test product",
            filters=None,
            sort_by=SortOrder.CREATED_DESC,
            limit=20,
            cursor=None
        )
        
        assert "search:test product" in key
        assert "sort:created_desc" in key
        assert "limit:20" in key
        
        # Search key with filters
        filters = ProductFilters(
            category_id=1,
            brand="Apple",
            is_featured=True
        )
        
        key = search_svc._generate_search_cache_key(
            query="iPhone",
            filters=filters,
            sort_by=SortOrder.PRICE_ASC,
            limit=10,
            cursor="cursor123"
        )
        
        assert "search:iphone" in key
        assert "sort:price_asc" in key
        assert "limit:10" in key
        assert "cursor:cursor123" in key
        assert "filters:" in key
        assert "cat:1" in key
        assert "brand:Apple" in key
        assert "featured:True" in key
    
    def test_generate_search_cache_key_price_range(self, search_svc):
        """Test cache key generation with price range filters."""
        filters = ProductFilters(
            price_range=PriceRange(min_price=100.0, max_price=500.0)
        )
        
        key = search_svc._generate_search_cache_key(
            query="test",
            filters=filters,
            sort_by=SortOrder.CREATED_DESC,
            limit=20,
            cursor=None
        )
        
        assert "min_price:100" in key
        assert "max_price:500" in key
    
    @pytest.mark.asyncio
    async def test_search_products_with_cache_hit(self, search_svc, mock_db_session):
        """Test search products with cache hit."""
        cached_result = {
            "products": [{"id": "1", "name": "Test Product"}],
            "pagination": {"cursor": None, "has_next": False},
            "search_query": "test",
            "total_count": 1,
            "search_time_ms": 10.5
        }
        
        with patch('app.services.search_service.cache_service') as mock_cache:
            mock_cache.get_search_results.return_value = cached_result
            
            result = await search_svc.search_products(
                db=mock_db_session,
                query="test",
                filters=None,
                sort_by=SortOrder.CREATED_DESC,
                limit=20,
                cursor=None
            )
            
            assert result.search_query == "test"
            assert len(result.products) == 1
            assert result.search_time_ms == 10.5
            # Should not hit database if cache hit
            mock_db_session.execute.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_search_products_cache_miss(self, search_svc, mock_db_session):
        """Test search products with cache miss."""
        # Mock cache miss
        with patch('app.services.search_service.cache_service') as mock_cache:
            mock_cache.get_search_results.return_value = None
            mock_cache.set_search_results.return_value = True
            
            # Mock database execution
            mock_search_results = [
                {
                    'id': 'prod1',
                    'name': 'Test Product',
                    'cursor': 'cursor1'
                }
            ]
            
            with patch.object(search_svc, '_execute_search_query') as mock_execute:
                mock_execute.return_value = (mock_search_results, 1, False)
                
                with patch.object(search_svc, '_process_search_results') as mock_process:
                    mock_process.return_value = [
                        {
                            "id": "prod1",
                            "name": "Test Product",
                            "slug": "test-product",
                            "base_price": 99.99
                        }
                    ]
                    
                    result = await search_svc.search_products(
                        db=mock_db_session,
                        query="test",
                        filters=None,
                        sort_by=SortOrder.CREATED_DESC,
                        limit=20,
                        cursor=None
                    )
                    
                    assert result.search_query == "test"
                    assert len(result.products) == 1
                    assert result.total_count == 1
                    assert result.search_time_ms > 0
                    
                    # Should cache the result
                    mock_cache.set_search_results.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_execute_search_query(self, search_svc, mock_db_session):
        """Test executing search query."""
        # Mock database result
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            Mock(_mapping={'id': 'prod1', 'name': 'Product 1', 'cursor': 'cursor1'}),
            Mock(_mapping={'id': 'prod2', 'name': 'Product 2', 'cursor': 'cursor2'})
        ]
        
        mock_db_session.execute.return_value = mock_result
        
        # Mock count query result
        mock_count_result = Mock()
        mock_count_result.scalar.return_value = 10
        
        # Set up multiple return values for execute calls
        mock_db_session.execute.side_effect = [mock_result, mock_count_result]
        
        query = "SELECT * FROM products WHERE name LIKE '%test%'"
        results, total_count, has_next = await search_svc._execute_search_query(
            db=mock_db_session,
            query=query,
            limit=2,
            cursor=None
        )
        
        assert len(results) == 2
        assert total_count == 10
        assert has_next is False  # 2 results, limit 2+1, so no extra result
        assert results[0]['id'] == 'prod1'
        assert results[1]['id'] == 'prod2'
    
    @pytest.mark.asyncio
    async def test_execute_search_query_with_cursor(self, search_svc, mock_db_session):
        """Test executing search query with cursor pagination."""
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            Mock(_mapping={'id': 'prod3', 'cursor': 'cursor3'}),
            Mock(_mapping={'id': 'prod4', 'cursor': 'cursor4'}),
            Mock(_mapping={'id': 'prod5', 'cursor': 'cursor5'})  # Extra result
        ]
        
        mock_count_result = Mock()
        mock_count_result.scalar.return_value = 10
        
        mock_db_session.execute.side_effect = [mock_result, mock_count_result]
        
        query = "SELECT * FROM products"
        results, total_count, has_next = await search_svc._execute_search_query(
            db=mock_db_session,
            query=query,
            limit=2,
            cursor="cursor2"
        )
        
        assert len(results) == 2  # Should remove extra result
        assert has_next is True  # Had extra result, so has next page
        assert total_count == 10
    
    @pytest.mark.asyncio
    async def test_process_search_results(self, search_svc, mock_db_session):
        """Test processing search results with related data."""
        search_results = [
            {'id': 'prod1', 'name': 'Product 1'},
            {'id': 'prod2', 'name': 'Product 2'}
        ]
        
        # Mock product query result
        mock_product1 = Mock()
        mock_product1.id = 'prod1'
        mock_product1.name = 'Product 1'
        mock_product1.slug = 'product-1'
        mock_product1.short_description = 'Short desc 1'
        mock_product1.base_price = 99.99
        mock_product1.brand = 'Brand A'
        mock_product1.is_featured = True
        mock_product1.price_range = (99.99, 99.99)
        mock_product1.category = Mock()
        mock_product1.category.id = 1
        mock_product1.category.name = 'Category 1'
        mock_product1.category.slug = 'category-1'
        mock_product1.images = []
        
        mock_product2 = Mock()
        mock_product2.id = 'prod2'
        mock_product2.name = 'Product 2'
        mock_product2.slug = 'product-2'
        mock_product2.short_description = 'Short desc 2'
        mock_product2.base_price = 149.99
        mock_product2.brand = 'Brand B'
        mock_product2.is_featured = False
        mock_product2.price_range = (149.99, 149.99)
        mock_product2.category = None
        mock_product2.images = []
        
        mock_query_result = Mock()
        mock_query_result.unique.return_value.scalars.return_value.all.return_value = [
            mock_product1, mock_product2
        ]
        
        mock_db_session.execute.return_value = mock_query_result
        
        results = await search_svc._process_search_results(mock_db_session, search_results)
        
        assert len(results) == 2
        assert results[0]['id'] == 'prod1'
        assert results[0]['name'] == 'Product 1'
        assert results[0]['brand'] == 'Brand A'
        assert results[0]['is_featured'] is True
        assert results[0]['category']['id'] == 1
        
        assert results[1]['id'] == 'prod2'
        assert results[1]['category'] is None
    
    @pytest.mark.asyncio
    async def test_process_search_results_with_images(self, search_svc, mock_db_session):
        """Test processing search results with primary images."""
        search_results = [{'id': 'prod1'}]
        
        # Mock product with images
        mock_image1 = Mock()
        mock_image1.id = 'img1'
        mock_image1.url = 'image1.jpg'
        mock_image1.alt_text = 'Image 1'
        mock_image1.is_primary = False
        mock_image1.thumbnail_url = 'thumb1.jpg'
        mock_image1.medium_url = 'medium1.jpg'
        mock_image1.large_url = 'large1.jpg'
        
        mock_image2 = Mock()
        mock_image2.id = 'img2'
        mock_image2.url = 'image2.jpg'
        mock_image2.alt_text = 'Image 2'
        mock_image2.is_primary = True
        mock_image2.thumbnail_url = 'thumb2.jpg'
        mock_image2.medium_url = 'medium2.jpg'
        mock_image2.large_url = 'large2.jpg'
        
        mock_product = Mock()
        mock_product.id = 'prod1'
        mock_product.name = 'Product 1'
        mock_product.slug = 'product-1'
        mock_product.short_description = None
        mock_product.base_price = 99.99
        mock_product.brand = None
        mock_product.is_featured = False
        mock_product.price_range = (99.99, 99.99)
        mock_product.category = None
        mock_product.images = [mock_image1, mock_image2]
        
        mock_query_result = Mock()
        mock_query_result.unique.return_value.scalars.return_value.all.return_value = [mock_product]
        mock_db_session.execute.return_value = mock_query_result
        
        results = await search_svc._process_search_results(mock_db_session, search_results)
        
        assert len(results) == 1
        assert results[0]['primary_image'] is not None
        assert results[0]['primary_image']['id'] == 'img2'
        assert results[0]['primary_image']['url'] == 'image2.jpg'
        assert results[0]['primary_image']['alt_text'] == 'Image 2'
    
    @pytest.mark.asyncio
    async def test_get_search_suggestions_basic(self, search_svc, mock_db_session):
        """Test getting search suggestions."""
        # Mock database result
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            ('iPhone 13', 0.8),
            ('iPhone 14', 0.7),
            ('iPad Pro', 0.5)
        ]
        
        mock_db_session.execute.return_value = mock_result
        
        with patch('app.services.search_service.cache_service') as mock_cache:
            mock_cache.get.return_value = None
            mock_cache.set.return_value = True
            
            suggestions = await search_svc.get_search_suggestions(
                db=mock_db_session,
                query="iph",
                limit=10
            )
            
            assert suggestions == ['iPhone 13', 'iPhone 14', 'iPad Pro']
            mock_cache.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_search_suggestions_cached(self, search_svc, mock_db_session):
        """Test getting cached search suggestions."""
        cached_suggestions = ['iPhone 13', 'iPhone 14']
        
        with patch('app.services.search_service.cache_service') as mock_cache:
            mock_cache.get.return_value = cached_suggestions
            
            suggestions = await search_svc.get_search_suggestions(
                db=mock_db_session,
                query="iph",
                limit=10
            )
            
            assert suggestions == cached_suggestions
            # Should not hit database if cached
            mock_db_session.execute.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_get_search_suggestions_short_query(self, search_svc, mock_db_session):
        """Test search suggestions with short query."""
        # Query too short
        suggestions = await search_svc.get_search_suggestions(
            db=mock_db_session,
            query="i",
            limit=10
        )
        
        assert suggestions == []
        mock_db_session.execute.assert_not_called()
        
        # Empty query
        suggestions = await search_svc.get_search_suggestions(
            db=mock_db_session,
            query="",
            limit=10
        )
        
        assert suggestions == []
        mock_db_session.execute.assert_not_called()
    
    def test_global_search_service_instance(self):
        """Test that global search service instance exists."""
        assert search_service is not None
        assert isinstance(search_service, SearchService)


class TestSearchServiceFilters:
    """Test search service filter handling."""
    
    @pytest.fixture
    def search_svc(self):
        """Search service instance."""
        return SearchService()
    
    def test_filters_with_digital_products(self, search_svc):
        """Test filtering digital products."""
        filters = ProductFilters(is_digital=True)
        
        query = search_svc._build_search_query(
            query="ebook",
            filters=filters,
            sort_by=SortOrder.CREATED_DESC
        )
        
        assert "is_digital = :is_digital" in query
    
    def test_filters_with_category_slug(self, search_svc):
        """Test filtering by category slug."""
        filters = ProductFilters(category_slug="electronics")
        
        query = search_svc._build_search_query(
            query="phone",
            filters=filters,
            sort_by=SortOrder.CREATED_DESC
        )
        
        # Should join with categories table
        assert "JOIN categories" in query or "categories c" in query
        assert "c.slug = :category_slug" in query
    
    def test_filters_stock_availability(self, search_svc):
        """Test stock availability filters."""
        # Test in_stock = True
        filters = ProductFilters(in_stock=True)
        query = search_svc._build_search_query("test", filters, SortOrder.CREATED_DESC)
        assert "in_stock = true" in query
        
        # Test in_stock = False
        filters = ProductFilters(in_stock=False)
        query = search_svc._build_search_query("test", filters, SortOrder.CREATED_DESC)
        assert "in_stock = false" in query
    
    def test_complex_filters_combination(self, search_svc):
        """Test combination of multiple filters."""
        filters = ProductFilters(
            category_id=1,
            brand="Apple",
            price_range=PriceRange(min_price=500, max_price=2000),
            is_featured=True,
            is_digital=False,
            in_stock=True
        )
        
        query = search_svc._build_search_query(
            query="MacBook",
            filters=filters,
            sort_by=SortOrder.PRICE_ASC
        )
        
        # Should contain all filter conditions
        assert "category_id = :category_id" in query
        assert "brand ILIKE :brand_filter" in query
        assert "min_price >= :min_price" in query
        assert "max_price <= :max_price" in query
        assert "is_featured = :is_featured" in query
        assert "is_digital = :is_digital" in query
        assert "in_stock = true" in query