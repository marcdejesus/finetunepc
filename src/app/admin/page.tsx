import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
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
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/db"

export default async function AdminDashboard() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/auth/error?error=AccessDenied")
  }

  // Fetch real analytics data
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    totalServices,
    pendingOrders,
    lowStockProducts,
    todayOrders,
    revenueData
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.product.count(),
    prisma.service.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { stock: { lte: 10 } } }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true }
    })
  ])

  const totalRevenue = Number(revenueData._sum?.total || 0)

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}. Here's what's happening with your store today.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {totalOrders} completed orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayOrders}</div>
              <p className="text-xs text-muted-foreground">
                {pendingOrders} pending orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {lowStockProducts} low stock alerts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {totalServices} service bookings
              </p>
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
              {pendingOrders > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-900">Pending Orders</p>
                    <p className="text-sm text-yellow-700">{pendingOrders} orders awaiting processing</p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {pendingOrders}
                  </Badge>
                </div>
              )}
              
              {lowStockProducts > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900">Low Stock Alert</p>
                    <p className="text-sm text-red-700">{lowStockProducts} products need restocking</p>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {lowStockProducts}
                  </Badge>
                </div>
              )}

              {pendingOrders === 0 && lowStockProducts === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>All systems running smoothly!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">New order received</p>
                  <p className="text-sm text-muted-foreground">Order processing queue updated</p>
                </div>
                <Badge variant="secondary">Today</Badge>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Inventory synchronized</p>
                  <p className="text-sm text-muted-foreground">Product stock levels updated</p>
                </div>
                <Badge variant="secondary">2 hours ago</Badge>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Wrench className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Service booking confirmed</p>
                  <p className="text-sm text-muted-foreground">New repair service scheduled</p>
                </div>
                <Badge variant="secondary">Yesterday</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 