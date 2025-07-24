import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date ranges
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
    const lastPeriodStart = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    // Get basic metrics
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalServices,
      pendingOrders,
      lowStockProducts,
      todayOrders,
      currentPeriodRevenue,
      lastPeriodRevenue,
      deliveredOrders
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.product.count(),
      prisma.service.count({
        where: { createdAt: { gte: startDate } }
      }),
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
        where: { 
          status: 'DELIVERED',
          createdAt: { gte: startDate }
        },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        where: { 
          status: 'DELIVERED',
          createdAt: { 
            gte: lastPeriodStart,
            lt: startDate 
          }
        },
        _sum: { total: true }
      }),
      prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate }
        },
        select: {
          total: true,
          createdAt: true
        }
      })
    ])

    const currentRevenue = Number(currentPeriodRevenue._sum?.total || 0)
    const lastRevenue = Number(lastPeriodRevenue._sum?.total || 0)
    const monthlyGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

    // Generate revenue chart data
    const revenueChart = []
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))
      
      const dayOrders = deliveredOrders.filter(order => 
        order.createdAt >= dayStart && order.createdAt <= dayEnd
      )
      
      const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total), 0)
      
      revenueChart.push({
        month: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        orders: dayOrders.length
      })
    }

    // Get category performance
    const categoryPerformance = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        products: {
          select: {
            orderItems: {
              where: {
                order: {
                  status: 'DELIVERED',
                  createdAt: { gte: startDate }
                }
              },
              select: {
                quantity: true,
                price: true
              }
            }
          }
        }
      }
    })

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0']
    const categoryChart = categoryPerformance
      .map((category, index) => {
        const revenue = category.products.reduce((sum, product) => 
          sum + product.orderItems.reduce((orderSum, item) => 
            orderSum + (Number(item.price) * item.quantity), 0
          ), 0
        )
        return {
          name: category.name,
          value: revenue,
          color: colors[index % colors.length]
        }
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    // Get top products
    const topProductsRaw = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        orderItems: {
          where: {
            order: {
              status: 'DELIVERED',
              createdAt: { gte: startDate }
            }
          },
          select: {
            quantity: true,
            price: true
          }
        }
      }
    })

    const topProducts = topProductsRaw
      .map(product => {
        const sales = product.orderItems.reduce((sum, item) => sum + item.quantity, 0)
        const revenue = product.orderItems.reduce((sum, item) => 
          sum + (Number(item.price) * item.quantity), 0
        )
        return {
          id: product.id,
          name: product.name,
          sales,
          revenue,
          stock: product.stock
        }
      })
      .filter(product => product.sales > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Get recent activity
    const [recentOrders, recentServices] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          createdAt: true,
          status: true
        }
      }),
      prisma.service.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          createdAt: true,
          price: true
        }
      })
    ])

    const recentActivity = [
      ...recentOrders.map(order => ({
        id: order.id,
        type: 'order' as const,
        description: `New ${order.status.toLowerCase()} order received`,
        timestamp: formatTimeAgo(order.createdAt),
        amount: Number(order.total)
      })),
      ...recentServices.map(service => ({
        id: service.id,
        type: 'service' as const,
        description: `${service.type.toLowerCase()} service booked`,
        timestamp: formatTimeAgo(service.createdAt),
        amount: service.price ? Number(service.price) : undefined
      }))
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)

    const dashboardData = {
      metrics: {
        totalRevenue: currentRevenue,
        totalOrders,
        totalProducts,
        totalUsers,
        totalServices,
        pendingOrders,
        lowStockProducts,
        todayOrders,
        monthlyGrowth
      },
      revenueChart,
      categoryChart,
      recentActivity,
      topProducts
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return date.toLocaleDateString()
} 