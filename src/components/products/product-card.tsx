'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'

interface ProductCardProps {
  product: {
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
  averageRating?: number
}

export function ProductCard({ product, averageRating = 0 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.images[0]?.url,
      slug: product.slug,
      stock: product.stock,
    })
  }
  
  const discountPercentage = product.comparePrice
    ? Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)
    : 0
    
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <Link href={`/products/${product.slug}`}>
        <div className="relative">
          {/* Product Image */}
          <div className="aspect-square relative overflow-hidden bg-gray-100">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.images[0].altText || product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <Badge variant="default" className="text-xs">
                Featured
              </Badge>
            )}
            {discountPercentage > 0 && (
              <Badge variant="destructive" className="text-xs">
                -{discountPercentage}%
              </Badge>
            )}
          </div>
          
          {/* Stock Status */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
          )}
          
          {/* Product Name */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          {averageRating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.floor(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                ({product._count?.reviews || 0})
              </span>
            </div>
          )}
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              ${Number(product.price).toFixed(2)}
            </span>
            {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
              <span className="text-sm text-muted-foreground line-through">
                ${Number(product.comparePrice).toFixed(2)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
      
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  )
} 