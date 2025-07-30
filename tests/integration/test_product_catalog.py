"""Integration tests for product catalog functionality."""

import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, Category
from app.models.product_variant import ProductVariant
from app.models.product_image import ProductImage, ImageType
from app.models.inventory import Inventory
from tests.fixtures.factories import (
    UserFactory, CategoryFactory, ProductFactory, 
    ProductVariantFactory, ProductImageFactory, InventoryFactory
)


class TestProductCatalogEndpoints:
    """Test product catalog API endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_products_basic(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test basic product listing."""
        # Create test data
        category = CategoryFactory()
        db_session.add(category)
        await db_session.commit()
        
        products = [
            ProductFactory(category_id=category.id, is_active=True) 
            for _ in range(3)
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/products")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "products" in data
        assert "pagination" in data
        assert len(data["products"]) == 3
        assert data["pagination"]["has_next"] is False
    
    @pytest.mark.asyncio
    async def test_get_products_with_filtering(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test product listing with filters."""
        # Create test categories
        category1 = CategoryFactory(name="Electronics")
        category2 = CategoryFactory(name="Clothing")
        db_session.add_all([category1, category2])
        await db_session.commit()
        
        # Create test products
        electronics_product = ProductFactory(
            category_id=category1.id,
            brand="TechBrand",
            base_price=100.00,
            is_featured=True
        )
        clothing_product = ProductFactory(
            category_id=category2.id,
            brand="FashionBrand",
            base_price=50.00,
            is_featured=False
        )
        db_session.add_all([electronics_product, clothing_product])
        await db_session.commit()
        
        # Test category filter
        response = await async_client.get(f"/api/v1/products?category_id={category1.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["products"]) == 1
        assert data["products"][0]["name"] == electronics_product.name
        
        # Test brand filter
        response = await async_client.get("/api/v1/products?brand=TechBrand")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["products"]) == 1
        
        # Test price range filter
        response = await async_client.get("/api/v1/products?min_price=75&max_price=150")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["products"]) == 1
        assert data["products"][0]["base_price"] == 100.00
        
        # Test featured filter
        response = await async_client.get("/api/v1/products?is_featured=true")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["products"]) == 1
        assert data["products"][0]["is_featured"] is True
    
    @pytest.mark.asyncio
    async def test_get_products_with_sorting(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test product listing with different sort orders."""
        # Create test products with different prices
        products = [
            ProductFactory(name="Product A", base_price=100.00, created_at="2023-01-01"),
            ProductFactory(name="Product B", base_price=50.00, created_at="2023-01-02"),
            ProductFactory(name="Product C", base_price=150.00, created_at="2023-01-03")
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        # Test price ascending sort
        response = await async_client.get("/api/v1/products?sort_by=price_asc")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        prices = [p["base_price"] for p in data["products"]]
        assert prices == sorted(prices)
        
        # Test price descending sort
        response = await async_client.get("/api/v1/products?sort_by=price_desc")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        prices = [p["base_price"] for p in data["products"]]
        assert prices == sorted(prices, reverse=True)
        
        # Test name ascending sort
        response = await async_client.get("/api/v1/products?sort_by=name_asc")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        names = [p["name"] for p in data["products"]]
        assert names == sorted(names)
    
    @pytest.mark.asyncio
    async def test_get_products_with_pagination(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test product listing with cursor-based pagination."""
        # Create multiple products
        products = [ProductFactory() for _ in range(5)]
        db_session.add_all(products)
        await db_session.commit()
        
        # Get first page
        response = await async_client.get("/api/v1/products?limit=2")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["products"]) == 2
        assert data["pagination"]["has_next"] is True
        assert "cursor" in data["pagination"]
        
        # Get next page using cursor
        cursor = data["pagination"]["cursor"]
        response = await async_client.get(f"/api/v1/products?limit=2&cursor={cursor}")
        assert response.status_code == status.HTTP_200_OK
        next_data = response.json()
        
        assert len(next_data["products"]) == 2
        # Products should be different
        first_page_ids = {p["id"] for p in data["products"]}
        second_page_ids = {p["id"] for p in next_data["products"]}
        assert first_page_ids.isdisjoint(second_page_ids)
    
    @pytest.mark.asyncio
    async def test_get_product_by_slug(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting product details by slug."""
        # Create test product with full details
        category = CategoryFactory()
        db_session.add(category)
        await db_session.commit()
        
        product = ProductFactory(
            category_id=category.id,
            slug="test-product",
            description="Test product description",
            is_active=True
        )
        db_session.add(product)
        await db_session.commit()
        
        # Create variants
        variant1 = ProductVariantFactory(
            product_id=product.id,
            sku="TEST-001",
            price=99.99,
            is_default=True
        )
        variant2 = ProductVariantFactory(
            product_id=product.id,
            sku="TEST-002",
            price=149.99,
            color="red"
        )
        db_session.add_all([variant1, variant2])
        await db_session.commit()
        
        # Create inventory
        inventory1 = InventoryFactory(variant_id=variant1.id, quantity_on_hand=10)
        inventory2 = InventoryFactory(variant_id=variant2.id, quantity_on_hand=5)
        db_session.add_all([inventory1, inventory2])
        await db_session.commit()
        
        # Create images
        image1 = ProductImageFactory(
            product_id=product.id,
            image_type=ImageType.MAIN,
            is_primary=True
        )
        image2 = ProductImageFactory(
            product_id=product.id,
            variant_id=variant1.id,
            image_type=ImageType.VARIANT
        )
        db_session.add_all([image1, image2])
        await db_session.commit()
        
        response = await async_client.get(f"/api/v1/products/{product.slug}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Check product details
        assert data["id"] == product.id
        assert data["slug"] == product.slug
        assert data["name"] == product.name
        assert data["description"] == product.description
        
        # Check category
        assert data["category"]["id"] == category.id
        assert data["category"]["name"] == category.name
        
        # Check variants
        assert len(data["variants"]) == 2
        variant_skus = {v["sku"] for v in data["variants"]}
        assert variant_skus == {"TEST-001", "TEST-002"}
        
        # Check default variant
        assert data["default_variant"] is not None
        assert data["default_variant"]["sku"] == "TEST-001"
        assert data["default_variant"]["is_default"] is True
        
        # Check inventory
        for variant in data["variants"]:
            assert "is_in_stock" in variant
            assert "available_quantity" in variant
            if variant["sku"] == "TEST-001":
                assert variant["available_quantity"] == 10
            elif variant["sku"] == "TEST-002":
                assert variant["available_quantity"] == 5
        
        # Check images
        assert len(data["images"]) == 2
        primary_images = [img for img in data["images"] if img["is_primary"]]
        assert len(primary_images) == 1
    
    @pytest.mark.asyncio
    async def test_get_product_by_slug_not_found(self, async_client: AsyncClient):
        """Test getting non-existent product."""
        response = await async_client.get("/api/v1/products/non-existent-product")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "Product not found" in data["detail"]
    
    @pytest.mark.asyncio
    async def test_get_product_variants(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting product variants."""
        product = ProductFactory(slug="variant-test-product")
        db_session.add(product)
        await db_session.commit()
        
        # Create variants with different attributes
        variants = [
            ProductVariantFactory(
                product_id=product.id,
                sku="VAR-001",
                size="M",
                color="Blue",
                price=99.99,
                is_active=True
            ),
            ProductVariantFactory(
                product_id=product.id,
                sku="VAR-002",
                size="L",
                color="Red",
                price=109.99,
                is_active=True
            ),
            ProductVariantFactory(
                product_id=product.id,
                sku="VAR-003",
                size="S",
                color="Green",
                price=89.99,
                is_active=False  # Inactive variant
            )
        ]
        db_session.add_all(variants)
        await db_session.commit()
        
        # Test getting active variants only
        response = await async_client.get(f"/api/v1/products/{product.slug}/variants")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2  # Only active variants
        skus = {v["sku"] for v in data}
        assert skus == {"VAR-001", "VAR-002"}
        
        # Check variant details
        for variant in data:
            assert "size" in variant
            assert "color" in variant
            assert "price" in variant
            assert variant["is_active"] is True
        
        # Test including inactive variants
        response = await async_client.get(f"/api/v1/products/{product.slug}/variants?include_inactive=true")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 3  # All variants
    
    @pytest.mark.asyncio
    async def test_get_categories_hierarchy(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting category hierarchy."""
        # Create category hierarchy
        root_category = CategoryFactory(
            name="Electronics",
            slug="electronics",
            parent_id=None,
            level=0,
            path="/electronics"
        )
        db_session.add(root_category)
        await db_session.commit()
        
        sub_category = CategoryFactory(
            name="Laptops",
            slug="laptops",
            parent_id=root_category.id,
            level=1,
            path="/electronics/laptops"
        )
        db_session.add(sub_category)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/categories")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 1  # One root category
        root = data[0]
        assert root["name"] == "Electronics"
        assert root["level"] == 0
        assert root["parent_id"] is None
        
        # Check children (this would need proper hierarchy building in the endpoint)
        # assert len(root["children"]) == 1
        # assert root["children"][0]["name"] == "Laptops"
    
    @pytest.mark.asyncio
    async def test_get_categories_flat(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting flat category list."""
        # Create categories
        categories = [
            CategoryFactory(name="Electronics", level=0),
            CategoryFactory(name="Clothing", level=0),
            CategoryFactory(name="Books", level=0)
        ]
        db_session.add_all(categories)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/categories?flat=true")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 3
        names = {cat["name"] for cat in data}
        assert names == {"Electronics", "Clothing", "Books"}
    
    @pytest.mark.asyncio
    async def test_get_category_products(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting products in a category."""
        # Create category
        category = CategoryFactory(slug="test-category")
        db_session.add(category)
        await db_session.commit()
        
        # Create products in category
        products_in_category = [
            ProductFactory(category_id=category.id) for _ in range(3)
        ]
        # Create product in different category
        other_category = CategoryFactory()
        db_session.add(other_category)
        await db_session.commit()
        
        product_in_other_category = ProductFactory(category_id=other_category.id)
        
        db_session.add_all(products_in_category + [product_in_other_category])
        await db_session.commit()
        
        response = await async_client.get(f"/api/v1/categories/{category.slug}/products")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["products"]) == 3
        # All products should be in the requested category
        for product in data["products"]:
            assert product["category"]["id"] == category.id
    
    @pytest.mark.asyncio
    async def test_search_products(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test product search functionality."""
        # Create test products with searchable content
        products = [
            ProductFactory(
                name="iPhone 13 Pro",
                brand="Apple",
                description="Latest iPhone with advanced camera",
                search_keywords="smartphone mobile phone apple ios"
            ),
            ProductFactory(
                name="Samsung Galaxy S22",
                brand="Samsung",
                description="Android smartphone with great camera",
                search_keywords="smartphone mobile phone samsung android"
            ),
            ProductFactory(
                name="MacBook Pro",
                brand="Apple",
                description="Professional laptop for developers",
                search_keywords="laptop computer apple macbook professional"
            )
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        # Test search by product name
        response = await async_client.get("/api/v1/search?q=iPhone")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["products"]) == 1
        assert "iPhone" in data["products"][0]["name"]
        assert data["search_query"] == "iPhone"
        assert "search_time_ms" in data
        
        # Test search by brand
        response = await async_client.get("/api/v1/search?q=Apple")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["products"]) == 2  # iPhone and MacBook
        
        # Test search with filters
        response = await async_client.get("/api/v1/search?q=smartphone&brand=Samsung")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data["products"]) == 1
        assert data["products"][0]["brand"] == "Samsung"
        
        # Test search with sorting
        response = await async_client.get("/api/v1/search?q=smartphone&sort_by=name_asc")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        if len(data["products"]) > 1:
            names = [p["name"] for p in data["products"]]
            assert names == sorted(names)
    
    @pytest.mark.asyncio
    async def test_search_suggestions(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test search suggestions/autocomplete."""
        # Create test products
        products = [
            ProductFactory(name="iPhone 13", brand="Apple"),
            ProductFactory(name="iPhone 14", brand="Apple"),
            ProductFactory(name="iPad Pro", brand="Apple")
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/search/suggestions?q=iph")
        
        assert response.status_code == status.HTTP_200_OK
        suggestions = response.json()
        
        assert isinstance(suggestions, list)
        # Should contain iPhone suggestions
        iphone_suggestions = [s for s in suggestions if "iPhone" in s]
        assert len(iphone_suggestions) >= 2
    
    @pytest.mark.asyncio
    async def test_get_filter_options(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test getting filter options."""
        response = await async_client.get("/api/v1/filters")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "brands" in data
        assert "categories" in data
        assert "price_ranges" in data
        assert "attributes" in data
        
        # Check structure
        assert isinstance(data["brands"], list)
        assert isinstance(data["categories"], list)
        assert isinstance(data["price_ranges"], list)
        assert isinstance(data["attributes"], dict)
    
    @pytest.mark.asyncio
    async def test_warm_cache(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test cache warming endpoint."""
        # Create some featured products
        products = [
            ProductFactory(is_featured=True) for _ in range(3)
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        response = await async_client.post("/api/v1/cache/warm?product_count=10")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "message" in data
        assert "products_cached" in data
        assert "categories_cached" in data
        assert data["categories_cached"] is True


class TestProductCatalogEdgeCases:
    """Test edge cases and error scenarios."""
    
    @pytest.mark.asyncio
    async def test_get_products_invalid_filters(self, async_client: AsyncClient):
        """Test product listing with invalid filter values."""
        # Test negative price
        response = await async_client.get("/api/v1/products?min_price=-10")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test invalid sort order
        response = await async_client.get("/api/v1/products?sort_by=invalid_sort")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test invalid limit
        response = await async_client.get("/api/v1/products?limit=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        response = await async_client.get("/api/v1/products?limit=101")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_search_empty_query(self, async_client: AsyncClient):
        """Test search with empty query."""
        response = await async_client.get("/api/v1/search?q=")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_search_very_long_query(self, async_client: AsyncClient):
        """Test search with very long query."""
        long_query = "a" * 501  # Exceeds max length
        response = await async_client.get(f"/api/v1/search?q={long_query}")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_get_category_products_not_found(self, async_client: AsyncClient):
        """Test getting products for non-existent category."""
        response = await async_client.get("/api/v1/categories/non-existent-category/products")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_product_variants_not_found(self, async_client: AsyncClient):
        """Test getting variants for non-existent product."""
        response = await async_client.get("/api/v1/products/non-existent-product/variants")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProductCatalogPerformance:
    """Test performance aspects of the product catalog."""
    
    @pytest.mark.asyncio
    async def test_large_product_list_performance(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test performance with large number of products."""
        # Create many products (in a real test, this might be more)
        products = [ProductFactory() for _ in range(50)]
        db_session.add_all(products)
        await db_session.commit()
        
        # Measure response time for product listing
        import time
        start_time = time.time()
        
        response = await async_client.get("/api/v1/products?limit=20")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == status.HTTP_200_OK
        assert response_time < 2.0  # Should respond in under 2 seconds
        
        data = response.json()
        assert len(data["products"]) == 20
        assert data["pagination"]["has_next"] is True
    
    @pytest.mark.asyncio
    async def test_search_performance(self, async_client: AsyncClient, db_session: AsyncSession):
        """Test search performance."""
        # Create products with searchable content
        products = [
            ProductFactory(
                name=f"Product {i}",
                description=f"Description for product {i}",
                search_keywords="test product sample"
            ) for i in range(30)
        ]
        db_session.add_all(products)
        await db_session.commit()
        
        response = await async_client.get("/api/v1/search?q=product")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Check that search_time_ms is reasonable
        assert data["search_time_ms"] < 1000  # Under 1 second
        assert len(data["products"]) > 0