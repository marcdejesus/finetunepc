'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { X, Filter } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  _count: {
    products: number
  }
  children?: Category[]
}

interface ProductFiltersProps {
  categories: Category[]
  brands: string[]
  filters: {
    search: string
    category: string
    brand: string
    minPrice: string
    maxPrice: string
    featured: boolean
    sortBy: string
    sortOrder: string
  }
  onFiltersChange: (filters: any) => void
  onClearFilters: () => void
}

export function ProductFilters({
  categories,
  brands,
  filters,
  onFiltersChange,
  onClearFilters,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }
  
  const activeFiltersCount = Object.values(filters).filter(Boolean).length
  
  return (
    <div className="space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      <div className={`space-y-4 ${isOpen ? 'block' : 'hidden lg:block'}`}>
        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Active Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {filters.search}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => handleFilterChange('search', '')}
                    />
                  </Badge>
                )}
                {filters.category && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {filters.category}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => handleFilterChange('category', '')}
                    />
                  </Badge>
                )}
                {filters.brand && (
                  <Badge variant="secondary" className="text-xs">
                    Brand: {filters.brand}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => handleFilterChange('brand', '')}
                    />
                  </Badge>
                )}
                {(filters.minPrice || filters.maxPrice) && (
                  <Badge variant="secondary" className="text-xs">
                    Price: ${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        handleFilterChange('minPrice', '')
                        handleFilterChange('maxPrice', '')
                      }}
                    />
                  </Badge>
                )}
                {filters.featured && (
                  <Badge variant="secondary" className="text-xs">
                    Featured
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => handleFilterChange('featured', false)}
                    />
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sort Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sort By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
                             onValueChange={(value: string) => {
                 const [sortBy, sortOrder] = value.split('-')
                 handleFilterChange('sortBy', sortBy)
                 handleFilterChange('sortOrder', sortOrder)
               }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Categories Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <div
                  className={`flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-50 ${
                    filters.category === category.slug ? 'bg-primary/10' : ''
                  }`}
                  onClick={() =>
                    handleFilterChange(
                      'category',
                      filters.category === category.slug ? '' : category.slug
                    )
                  }
                >
                  <span className="text-sm">{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({category._count.products})
                  </span>
                </div>
                
                {/* Subcategories */}
                {category.children && category.children.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {category.children.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className={`flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-gray-50 ${
                          filters.category === subcategory.slug ? 'bg-primary/10' : ''
                        }`}
                        onClick={() =>
                          handleFilterChange(
                            'category',
                            filters.category === subcategory.slug ? '' : subcategory.slug
                          )
                        }
                      >
                        <span className="text-xs">{subcategory.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({subcategory._count.products})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Brands Filter */}
        {brands.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Brands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand}
                  className={`flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50 ${
                    filters.brand === brand ? 'bg-primary/10' : ''
                  }`}
                  onClick={() =>
                    handleFilterChange('brand', filters.brand === brand ? '' : brand)
                  }
                >
                  <span className="text-sm">{brand}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Price Range Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Price Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="minPrice" className="text-xs">
                  Min Price
                </Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="$0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-xs">
                  Max Price
                </Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="No limit"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Special Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={filters.featured}
                                 onCheckedChange={(checked: boolean) => handleFilterChange('featured', checked)}
              />
              <Label htmlFor="featured" className="text-sm">
                Featured Products
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 