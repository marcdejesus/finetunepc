'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  Eye, 
  Package, 
  Truck, 
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface Order {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  total: number
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  orderItems: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      slug: string
      images: Array<{
        url: string
        altText: string
      }>
    }
  }>
  trackingNumber?: string
  notes?: string
  refundAmount?: number
  refundReason?: string
  refundedAt?: string
}

interface OrdersResponse {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  insights: {
    pendingCount: number
    processingCount: number
    shippedCount: number
    totalRevenue: number
    todayOrders: number
    averageOrderValue: number
    totalOrders: number
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)

  // Form state for bulk updates
  const [bulkUpdateData, setBulkUpdateData] = useState({
    status: '' as Order['status'] | '',
    trackingNumber: '',
    notes: ''
  })

  // Form state for refunds
  const [refundData, setRefundData] = useState({
    amount: 0,
    reason: ''
  })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter })
      })

      const response = await fetch(`/api/admin/orders?${params}`)
      
      if (response.ok) {
        const data: OrdersResponse = await response.json()
        setOrders(data.orders)
        setPagination(data.pagination)
        setInsights(data.insights)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch orders:', errorData.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [page, sortBy, sortOrder, searchTerm, statusFilter, dateFromFilter, dateToFilter])

  const handleBulkStatusUpdate = async () => {
    if (selectedOrders.length === 0 || !bulkUpdateData.status) return

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
          status: bulkUpdateData.status,
          trackingNumber: bulkUpdateData.trackingNumber,
          notes: bulkUpdateData.notes
        })
      })

      if (response.ok) {
        setSelectedOrders([])
        setBulkUpdateData({ status: '', trackingNumber: '', notes: '' })
        setIsUpdateModalOpen(false)
        fetchOrders()
      } else {
        const data = await response.json()
        console.error('Failed to update orders:', data.error)
      }
    } catch (error) {
      console.error('Error updating orders:', error)
    }
  }

  const handleRefund = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount: refundData.amount || selectedOrder.total,
          reason: refundData.reason
        })
      })

      if (response.ok) {
        setIsRefundModalOpen(false)
        setRefundData({ amount: 0, reason: '' })
        setSelectedOrder(null)
        fetchOrders()
      } else {
        const data = await response.json()
        console.error('Failed to process refund:', data.error)
      }
    } catch (error) {
      console.error('Error processing refund:', error)
    }
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800'
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      case 'REFUNDED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3" />
      case 'CONFIRMED':
        return <CheckCircle className="h-3 w-3" />
      case 'PROCESSING':
        return <Package className="h-3 w-3" />
      case 'SHIPPED':
        return <Truck className="h-3 w-3" />
      case 'DELIVERED':
        return <CheckCircle className="h-3 w-3" />
      case 'CANCELLED':
      case 'REFUNDED':
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Order Management</h1>
            <p className="text-muted-foreground">
              Process orders, update shipping status, and manage refunds
            </p>
          </div>
          
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Insights Cards */}
        {insights && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${typeof insights.totalRevenue === 'number' 
                    ? insights.totalRevenue.toFixed(2) 
                    : Number(insights.totalRevenue || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average: ${typeof insights.averageOrderValue === 'number' 
                    ? insights.averageOrderValue.toFixed(2) 
                    : Number(insights.averageOrderValue || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{insights.pendingCount}</div>
                <p className="text-xs text-muted-foreground">
                  Need processing
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{insights.processingCount}</div>
                <p className="text-xs text-muted-foreground">
                  Being processed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shipped Today</CardTitle>
                <Truck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{insights.shippedCount}</div>
                <p className="text-xs text-muted-foreground">
                  Out for delivery
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders, customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
              
              <div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              
              <div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setDateFromFilter('')
                  setDateToFilter('')
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedOrders.length} orders selected
                </span>
                <div className="flex space-x-2">
                  <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                        <DialogDescription>
                          Update status for {selectedOrders.length} selected orders
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="bulk-status">New Status</Label>
                          <Select
                            value={bulkUpdateData.status}
                            onValueChange={(value) => setBulkUpdateData(prev => ({ ...prev, status: value as Order['status'] }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                              <SelectItem value="PROCESSING">Processing</SelectItem>
                              <SelectItem value="SHIPPED">Shipped</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {bulkUpdateData.status === 'SHIPPED' && (
                          <div>
                            <Label htmlFor="tracking">Tracking Number</Label>
                            <Input
                              id="tracking"
                              value={bulkUpdateData.trackingNumber}
                              onChange={(e) => setBulkUpdateData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                              placeholder="Enter tracking number"
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                          <Textarea
                            id="bulk-notes"
                            value={bulkUpdateData.notes}
                            onChange={(e) => setBulkUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add notes..."
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBulkStatusUpdate}>
                          Update Orders
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setSelectedOrders([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrders(orders.map(o => o.id))
                        } else {
                          setSelectedOrders([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-auto p-0 font-medium">
                      Total <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-auto p-0 font-medium">
                      Date <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrders(prev => [...prev, order.id])
                            } else {
                              setSelectedOrders(prev => prev.filter(id => id !== order.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">#{order.id.slice(-8)}</div>
                        {order.trackingNumber && (
                          <div className="text-sm text-muted-foreground">
                            Track: {order.trackingNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.user.name}</p>
                          <p className="text-sm text-muted-foreground">{order.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.orderItems.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-sm">
                              {item.quantity}x {item.product.name}
                            </div>
                          ))}
                          {order.orderItems.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{order.orderItems.length - 2} more items
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${Number(order.total).toFixed(2)}</div>
                        {order.refundAmount && (
                          <div className="text-sm text-red-600">
                            Refunded: ${Number(order.refundAmount).toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Open order details modal
                              console.log('View order details:', order.id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(order.status === 'DELIVERED' || order.status === 'SHIPPED') && !order.refundAmount && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setRefundData({ amount: Number(order.total), reason: '' })
                                setIsRefundModalOpen(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} orders
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Process a refund for order #{selectedOrder?.id.slice(-8)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Order Total</Label>
                  <div className="text-lg font-medium">${Number(selectedOrder.total).toFixed(2)}</div>
                </div>
                
                <div>
                  <Label htmlFor="refund-amount">Refund Amount</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    value={refundData.amount}
                    onChange={(e) => setRefundData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    max={Number(selectedOrder.total)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="refund-reason">Refund Reason</Label>
                  <Textarea
                    id="refund-reason"
                    value={refundData.reason}
                    onChange={(e) => setRefundData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for refund..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRefund}
                className="bg-red-600 hover:bg-red-700"
                disabled={!refundData.reason.trim()}
              >
                Process Refund
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
} 