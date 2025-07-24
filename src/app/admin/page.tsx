'use client'

import { useState, useEffect } from 'react'
import { redirect } from "next/navigation"
import { useSession } from 'next-auth/react'
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  Package,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Eye,
  ShoppingCart
} from "lucide-react"
import Link from "next/link"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface DashboardData {
  metrics: {
    totalRevenue: number
    totalOrders: number
    totalProducts: number
    totalUsers: number
    totalServices: number
    pendingOrders: number
    lowStockProducts: number
    todayOrders: number
    monthlyGrowth: number
  }
  revenueChart: Array<{
    month: string
    revenue: number
    orders: number
  }>
  categoryChart: Array<{
    name: string
    value: number
    color: string
  }>
  recentActivity: Array<{
    id: string
    type: 'order' | 'service' | 'product'
    description: string
    timestamp: string
    amount?: number
  }>
  topProducts: Array<{
    id: string
    name: string
    sales: number
    revenue: number
    stock: number
  }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      redirect("/auth/signin")
    }

    if (session.user.role !== "ADMIN") {
      redirect("/auth/error?error=AccessDenied")
    }

    fetchDashboardData()
  }, [session, status, timeRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
    setLoading(false)
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!session || !dashboardData) {
    return null
  }

  const { metrics, revenueChart, categoryChart, recentActivity, topProducts } = dashboardData

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">
              Welcome back, {session.user.name}. Here's what's happening with your store.
            </p>
          </div>
          
          <div className="flex space-x-2">
            {['7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +{metrics.monthlyGrowth.toFixed(1)}% from last month
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.todayOrders} today • {metrics.pendingOrders} pending
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.lowStockProducts} low stock alerts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalServices} service bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Monthly revenue and order volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? `$${value.toFixed(2)}` : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>
                Product category performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChart}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {categoryChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>
                Best selling products this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.sales} sold • {product.stock} in stock
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${product.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across your store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'order' ? 'bg-green-100' : 
                      activity.type === 'service' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {activity.type === 'order' && <ShoppingBag className="h-4 w-4 text-green-600" />}
                      {activity.type === 'service' && <Wrench className="h-4 w-4 text-purple-600" />}
                      {activity.type === 'product' && <Package className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                    </div>
                    {activity.amount && (
                      <Badge variant="secondary">${activity.amount.toFixed(2)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Alerts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/products">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Manage Products</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/admin/orders">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="h-4 w-4" />
                    <span>Process Orders</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/admin/services">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-4 w-4" />
                    <span>Service Queue</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>System Alerts</span>
              </CardTitle>
              <CardDescription>
                Items that need your attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.pendingOrders > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-900">Pending Orders</p>
                    <p className="text-sm text-yellow-700">{metrics.pendingOrders} orders awaiting processing</p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {metrics.pendingOrders}
                  </Badge>
                </div>
              )}
              
              {metrics.lowStockProducts > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900">Low Stock Alert</p>
                    <p className="text-sm text-red-700">{metrics.lowStockProducts} products need restocking</p>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {metrics.lowStockProducts}
                  </Badge>
                </div>
              )}

              {metrics.pendingOrders === 0 && metrics.lowStockProducts === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>All systems running smoothly!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
} 