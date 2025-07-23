'use client'

import { ProductCard } from './product-card'

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

interface ProductGridProps {
  products: Product[]
  averageRatings?: Record<string, number>
}

export function ProductGrid({ products, averageRatings = {} }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          averageRating={averageRatings[product.id]}
        />
      ))}
    </div>
  )
} 