'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Package, Truck, Mail, Home, ShoppingBag, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface OrderConfirmationData {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  tax: number
  shipping: number
  createdAt: string
  items: {
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      slug: string
      images: { url: string; altText?: string }[]
    }
  }[]
  shippingAddress: {
    firstName: string
    lastName: string
    company?: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  user: {
    name?: string
    email: string
  }
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const orderId = params.orderId as string
  
  const [order, setOrder] = useState<OrderConfirmationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchOrder()
  }, [session, status, orderId, router])
  
  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Order not found')
      }
      
      const orderData = await response.json()
      setOrder(orderData)
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Order not found or you do not have permission to view it.')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }
  
  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-x-4">
              <Button asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/orders">View Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const estimatedDelivery = new Date()
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5) // 5 business days
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
        <p className="text-lg text-muted-foreground">
          Thank you for your purchase. Your order has been successfully placed.
        </p>
      </div>
      
      {/* Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Status</p>
                  <Badge variant="default" className="bg-green-600">
                    {order.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge variant="default" className="bg-blue-600">
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Shipping Address</p>
                  <div className="text-sm">
                    <p className="font-semibold">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    {order.shippingAddress.company && (
                      <p>{order.shippingAddress.company}</p>
                    )}
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Estimated Delivery</p>
                  <p className="font-semibold">
                    {estimatedDelivery.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    5-7 business days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                      {item.product.images[0] ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.images[0].altText || item.product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(Number(item.price) * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${Number(item.price).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Order Summary Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    {Number(order.shipping) === 0 ? (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    ) : (
                      `$${Number(order.shipping).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${Number(order.tax).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              {/* Actions */}
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/orders">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    View All Orders
                  </Link>
                </Button>
                
                {/* Invoice Download */}
                {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/api/orders/${order.id}/invoice`} target="_blank">
                      <Package className="w-4 h-4 mr-2" />
                      Download Invoice
                    </Link>
                  </Button>
                )}
                
                <Button asChild variant="outline" className="w-full">
                  <Link href="/products">
                    <Home className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
              
              {/* Email Confirmation */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Mail className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-blue-900">Confirmation Email Sent</p>
                    <p className="text-blue-700">
                      A confirmation email has been sent to {order.user.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 