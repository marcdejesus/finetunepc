import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ServiceStatus, ServiceType, Priority } from '@prisma/client'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, subDays, subWeeks, subMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    const timeframe = searchParams.get('timeframe') || 'daily' // daily, weekly, monthly

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let endDate = endOfDay(now)

    switch (period) {
      case '7d':
        startDate = startOfDay(subDays(now, 7))
        break
      case '30d':
        startDate = startOfDay(subDays(now, 30))
        break
      case '90d':
        startDate = startOfDay(subDays(now, 90))
        break
      case '1y':
        startDate = startOfDay(subDays(now, 365))
        break
      default:
        startDate = startOfDay(subDays(now, 30))
    }

    // Get comprehensive service analytics
    const [
      totalServices,
      statusBreakdown,
      typeBreakdown,
      priorityBreakdown,
      completionRate,
      averageCompletionTime,
      revenueStats,
      technicianPerformance,
      serviceTrends,
      customerStats
    ] = await Promise.all([
      // Total services count
      prisma.service.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),

      // Status breakdown
      prisma.service.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          status: true
        }
      }),

      // Service type breakdown
      prisma.service.groupBy({
        by: ['type'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          type: true
        },
        _sum: {
          price: true
        }
      }),

      // Priority breakdown
      prisma.service.groupBy({
        by: ['priority'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          priority: true
        }
      }),

      // Completion rate
      prisma.service.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: {
            in: ['COMPLETED', 'CANCELLED']
          }
        },
        _count: {
          status: true
        }
      }),

      // Average completion time for completed services
      prisma.service.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          createdAt: true,
          updatedAt: true,
          estimatedHours: true,
          actualHours: true
        }
      }),

      // Revenue statistics
      prisma.service.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          price: true
        },
        _avg: {
          price: true
        },
        _count: {
          price: true
        }
      }),

      // Technician performance
      prisma.service.groupBy({
        by: ['assignedTo', 'status'],
        where: {
          assignedTo: {
            not: null
          },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        _sum: {
          actualHours: true,
          price: true
        }
      }),

      // Service trends over time
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${timeframe === 'daily' ? 'day' : timeframe === 'weekly' ? 'week' : 'month'}, "createdAt") as period,
          COUNT(*)::integer as count,
          SUM("price")::float as revenue,
          COUNT(CASE WHEN "status" = 'COMPLETED' THEN 1 END)::integer as completed
        FROM "Service"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY period
        ORDER BY period
      `,

      // Customer statistics
      prisma.service.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          userId: true
        },
        _sum: {
          price: true
        },
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      })
    ])

    // Get technician details for performance data
    const technicianIds = [...new Set(technicianPerformance.map(tp => tp.assignedTo).filter(Boolean))]
    const technicians = await prisma.user.findMany({
      where: {
        id: { in: technicianIds as string[] },
        role: { in: ['TECHNICIAN', 'MANAGER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    // Get customer details for top customers
    const customerIds = customerStats.map(cs => cs.userId)
    const customers = await prisma.user.findMany({
      where: {
        id: { in: customerIds }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Process completion rate
    const completedCount = completionRate.find(cr => cr.status === 'COMPLETED')?._count.status || 0
    const cancelledCount = completionRate.find(cr => cr.status === 'CANCELLED')?._count.status || 0
    const totalClosed = completedCount + cancelledCount
    const completionRatePercentage = totalClosed > 0 ? (completedCount / totalClosed) * 100 : 0

    // Process average completion time
    const completionTimes = averageCompletionTime.map(service => {
      const createdAt = new Date(service.createdAt)
      const updatedAt = new Date(service.updatedAt)
      return {
        daysToComplete: Math.ceil((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        estimatedHours: service.estimatedHours,
        actualHours: service.actualHours
      }
    })

    const avgDaysToComplete = completionTimes.length > 0 
      ? completionTimes.reduce((sum, ct) => sum + ct.daysToComplete, 0) / completionTimes.length 
      : 0

    const avgActualHours = completionTimes
      .filter(ct => ct.actualHours)
      .reduce((sum, ct, _, arr) => sum + (ct.actualHours || 0) / arr.length, 0)

    // Process technician performance
    const techPerformanceMap = new Map()
    technicianPerformance.forEach(tp => {
      const techId = tp.assignedTo!
      if (!techPerformanceMap.has(techId)) {
        techPerformanceMap.set(techId, {
          technicianId: techId,
          totalServices: 0,
          completedServices: 0,
          totalHours: 0,
          totalRevenue: 0
        })
      }
      
      const perf = techPerformanceMap.get(techId)
      perf.totalServices += tp._count.id
      if (tp.status === 'COMPLETED') {
        perf.completedServices += tp._count.id
      }
      perf.totalHours += tp._sum.actualHours || 0
      perf.totalRevenue += tp._sum.price || 0
    })

    const technicianStats = Array.from(techPerformanceMap.values()).map(perf => {
      const technician = technicians.find(t => t.id === perf.technicianId)
      return {
        technician,
        ...perf,
        completionRate: perf.totalServices > 0 ? (perf.completedServices / perf.totalServices) * 100 : 0
      }
    })

    // Process customer statistics
    const topCustomers = customerStats.map(cs => {
      const customer = customers.find(c => c.id === cs.userId)
      return {
        customer,
        serviceCount: cs._count.userId,
        totalSpent: cs._sum.price || 0
      }
    })

    return NextResponse.json({
      summary: {
        totalServices,
        totalRevenue: revenueStats._sum.price || 0,
        averageServiceValue: revenueStats._avg.price || 0,
        completionRate: Math.round(completionRatePercentage * 100) / 100,
        avgDaysToComplete: Math.round(avgDaysToComplete * 100) / 100,
        avgActualHours: Math.round(avgActualHours * 100) / 100
      },
      breakdowns: {
        status: statusBreakdown,
        type: typeBreakdown,
        priority: priorityBreakdown
      },
      trends: serviceTrends,
      technicianPerformance: technicianStats,
      topCustomers,
      period,
      dateRange: {
        start: startDate,
        end: endDate
      }
    })
  } catch (error) {
    console.error('Error fetching service analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}