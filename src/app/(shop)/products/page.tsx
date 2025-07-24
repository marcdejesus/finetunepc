'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProductGrid } from '@/components/products/product-grid'
import { ProductFilters } from '@/components/products/product-filters'
import { PageContainer, PageHeader, PageTitle } from '@/components/layout/page-container'
import { Search, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  stock: number
  images: { url: string; altText?: string }[]
  featured?: boolean
  brand?: string
  _count?: {
    reviews: number
  }
}

interface Category {
  id: string
  name: string
  slug: string
  _count: {
    products: number
  }
  children?: Category[]
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // State
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  
  // Filters state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    featured: searchParams.get('featured') === 'true',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: searchParams.get('page') || '1',
  })
  
  // Update URL when filters change
  const updateURL = useCallback((newFilters: typeof filters) => {
    const params = new URLSearchParams()
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'false') {
        params.set(key, value.toString())
      }
    })
    
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newURL, { scroll: false })
  }, [pathname, router])
  
  // Fetch products
  const fetchProducts = useCallback(async (currentFilters: typeof filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'false') {
          params.set(key, value.toString())
        }
      })
      
      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch products')
      
      const data = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Fetch categories and brands
  const fetchFiltersData = useCallback(async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        fetch('/api/categories?includeChildren=true'),
        fetch('/api/products?limit=1000'), // Get all products to extract brands
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        const uniqueBrands = Array.from(
          new Set(
            productsData.products
              .map((p: Product) => p.brand)
              .filter(Boolean)
          )
        ).sort() as string[]
        setBrands(uniqueBrands)
      }
    } catch (error) {
      console.error('Error fetching filters data:', error)
    }
  }, [])
  
  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    const updatedFilters = { ...newFilters, page: '1' } // Reset to first page
    setFilters(updatedFilters)
    updateURL(updatedFilters)
    fetchProducts(updatedFilters)
  }, [updateURL, fetchProducts])
  
  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    const updatedFilters = { ...filters, page: page.toString() }
    setFilters(updatedFilters)
    updateURL(updatedFilters)
    fetchProducts(updatedFilters)
  }, [filters, updateURL, fetchProducts])
  
  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const updatedFilters = { ...filters, search: searchValue, page: '1' }
    setFilters(updatedFilters)
    updateURL(updatedFilters)
    fetchProducts(updatedFilters)
  }, [filters, searchValue, updateURL, fetchProducts])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      search: '',
      category: '',
      brand: '',
      minPrice: '',
      maxPrice: '',
      featured: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: '1',
    }
    setFilters(clearedFilters)
    setSearchValue('')
    updateURL(clearedFilters)
    fetchProducts(clearedFilters)
  }, [updateURL, fetchProducts])
  
  // Initialize
  useEffect(() => {
    setSearchValue(filters.search)
    fetchFiltersData()
    fetchProducts(filters)
  }, [])
  
  // Update filters when URL changes
  useEffect(() => {
    const newFilters = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      brand: searchParams.get('brand') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      featured: searchParams.get('featured') === 'true',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      page: searchParams.get('page') || '1',
    }
    
    if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
      setFilters(newFilters)
      setSearchValue(newFilters.search)
      fetchProducts(newFilters)
    }
  }, [searchParams])
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle subtitle="Discover premium computer components, parts, and accessories from trusted brands">
          Products
        </PageTitle>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-md mt-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pr-10"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              variant="ghost"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters
            categories={categories}
            brands={brands}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={clearFilters}
          />
        </div>
        
        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="mb-6">
            {pagination && (
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} products
              </p>
            )}
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          
          {/* Products Grid */}
          {!loading && <ProductGrid products={products} />}
          
          {/* Pagination */}
          {!loading && pagination && pagination.totalPages > 1 && (
            <Card className="mt-8">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

// Loading component for Suspense boundary
function ProductsPageLoading() {
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Products</PageTitle>
        <div className="max-w-md mt-6">
          <div className="relative">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="lg:col-span-3">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

// Main export with Suspense boundary
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageLoading />}>
      <ProductsPageContent />
    </Suspense>
  )
} 