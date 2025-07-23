'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Package, Search, Eye, Truck, Clock, CheckCircle, X, Loader2, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  trackingNumber?: string
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
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin?callbackUrl=/orders')
      return
    }
    
    fetchOrders()
  }, [session, status, router])
  
  useEffect(() => {
    filterAndSortOrders()
  }, [orders, searchQuery, statusFilter, sortBy])
  
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const filterAndSortOrders = () => {
    let filtered = [...orders]
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item =>
          item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'amount-high':
          return Number(b.total) - Number(a.total)
        case 'amount-low':
          return Number(a.total) - Number(b.total)
        default:
          return 0
      }
    })
    
    setFilteredOrders(filtered)
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'CONFIRMED':
        return <Package className="w-4 h-4" />
      case 'PROCESSING':
        return <Package className="w-4 h-4" />
      case 'SHIPPED':
        return <Truck className="w-4 h-4" />
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4" />
      case 'CANCELLED':
        return <X className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500'
      case 'CONFIRMED':
        return 'bg-blue-500'
      case 'PROCESSING':
        return 'bg-purple-500'
      case 'SHIPPED':
        return 'bg-orange-500'
      case 'DELIVERED':
        return 'bg-green-500'
      case 'CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">Track and manage your orders</p>
      </div>
      
      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                <SelectItem value="amount-low">Amount: Low to High</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Results Count */}
            <div className="flex items-center text-sm text-muted-foreground">
              {filteredOrders.length} of {orders.length} orders
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {orders.length === 0 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {orders.length === 0 && (
                <Button asChild>
                  <Link href="/products">Start Shopping</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ordered on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getStatusColor(order.status)} text-white mb-2`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                      </span>
                    </Badge>
                    <p className="text-lg font-semibold">${Number(order.total).toFixed(2)}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Order Items Preview */}
                <div className="space-y-3 mb-4">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="relative w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        {item.product.images[0] ? (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.images[0].altText || item.product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="text-sm font-medium hover:text-primary transition-colors truncate block"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {order.items.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{order.items.length - 3} more items
                    </p>
                  )}
                </div>
                
                {/* Tracking Number */}
                {order.trackingNumber && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                        <p className="text-sm text-blue-700 font-mono">{order.trackingNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/checkout/confirmation/${order.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  
                  {/* Invoice Download */}
                  {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/api/orders/${order.id}/invoice`} target="_blank">
                        <FileText className="w-4 h-4 mr-2" />
                        Invoice
                      </Link>
                    </Button>
                  )}
                  
                  {order.status === 'DELIVERED' && (
                    <Button variant="outline" size="sm">
                      Reorder Items
                    </Button>
                  )}
                  
                  {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 