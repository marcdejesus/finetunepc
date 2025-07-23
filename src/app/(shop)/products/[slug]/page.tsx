'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProductGrid } from '@/components/products/product-grid'
import { useCartStore } from '@/store/cart-store'
import { Star, ShoppingCart, Plus, Minus, Truck, Shield, RefreshCw, ArrowLeft } from 'lucide-react'

interface ProductImage {
  id: string
  url: string
  altText?: string
  position: number
}

interface Review {
  id: string
  rating: number
  title?: string
  comment?: string
  user: {
    name?: string
    image?: string
  }
  createdAt: string
  verified: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string
  price: number
  comparePrice?: number
  stock: number
  brand?: string
  warranty?: string
  specifications?: any
  images: ProductImage[]
  reviews: Review[]
  averageRating: number
  relatedProducts: any[]
  category: {
    id: string
    name: string
    slug: string
  }
  _count: {
    reviews: number
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  
  const addItem = useCartStore((state) => state.addItem)
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${slug}`)
        if (!response.ok) throw new Error('Product not found')
        
        const data = await response.json()
        setProduct(data)
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProduct()
  }, [slug])
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/products">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const handleAddToCart = () => {
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
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">Products</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary">
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </nav>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
            {product.images[selectedImageIndex] ? (
              <Image
                src={product.images[selectedImageIndex].url}
                alt={product.images[selectedImageIndex].altText || product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image Available
              </div>
            )}
          </div>
          
          {/* Thumbnail Images */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`View image ${index + 1} of ${product.name}`}
                  className={`aspect-square relative overflow-hidden rounded-md bg-gray-100 border-2 transition-colors ${
                    selectedImageIndex === index ? 'border-primary' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.altText || `${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="space-y-6">
          {/* Brand */}
          {product.brand && (
            <div className="text-sm text-muted-foreground">{product.brand}</div>
          )}
          
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-lg text-muted-foreground mt-2">{product.shortDescription}</p>
            )}
          </div>
          
          {/* Rating */}
          {product._count.reviews > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.averageRating.toFixed(1)} ({product._count.reviews} reviews)
              </span>
            </div>
          )}
          
          {/* Price */}
          <div className="space-y-2">
                       <div className="flex items-center space-x-3">
             <span className="text-3xl font-bold">${Number(product.price).toFixed(2)}</span>
             {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
               <>
                 <span className="text-xl text-muted-foreground line-through">
                   ${Number(product.comparePrice).toFixed(2)}
                 </span>
                 <Badge variant="destructive">Save {discountPercentage}%</Badge>
               </>
             )}
           </div>
          </div>
          
          {/* Stock Status */}
          <div>
            {product.stock > 0 ? (
              <Badge variant="default" className="bg-green-600">
                {product.stock > 10 ? 'In Stock' : `Only ${product.stock} left`}
              </Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
          
          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Quantity:</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
            <div className="flex items-center space-x-2 text-sm">
              <Truck className="w-5 h-5 text-green-600" />
              <span>Free Shipping</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>{product.warranty || '1 Year'} Warranty</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <RefreshCw className="w-5 h-5 text-purple-600" />
              <span>30-Day Returns</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Details Tabs */}
      <div className="mt-16 space-y-8">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{product.description}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Specifications */}
        {product.specifications && (
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Reviews */}
        {product.reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {product.reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium">{review.user.name || 'Anonymous'}</span>
                      {review.verified && (
                        <Badge variant="outline" className="text-xs">Verified Purchase</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-semibold mb-1">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Related Products */}
      {product.relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">Related Products</h2>
          <ProductGrid products={product.relatedProducts} />
        </div>
      )}
    </div>
  )
} 