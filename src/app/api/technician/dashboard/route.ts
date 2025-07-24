import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startOfDay, startOfWeek, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Technician access required' }, { status: 401 })
    }

    const technicianId = session.user.id
    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const last30Days = subDays(today, 30)

    // Get technician's service statistics
    const [
      assignedServices,
      todayServices,
      weekServices,
      completedThisMonth,
      totalHoursThisWeek,
      recentActivity,
      upcomingServices,
      servicesByStatus,
      performanceStats
    ] = await Promise.all([
      // All assigned services (active)
      prisma.service.count({
        where: {
          assignedTo: technicianId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ON_HOLD'] }
        }
      }),

      // Today's services
      prisma.service.findMany({
        where: {
          assignedTo: technicianId,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          scheduledDate: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      }),

      // This week's services
      prisma.service.count({
        where: {
          assignedTo: technicianId,
          scheduledDate: {
            gte: startOfThisWeek,
            lte: endOfToday
          }
        }
      }),

      // Completed services this month
      prisma.service.count({
        where: {
          assignedTo: technicianId,
          status: 'COMPLETED',
          updatedAt: {
            gte: last30Days
          }
        }
      }),

      // Total hours worked this week
      prisma.service.aggregate({
        where: {
          assignedTo: technicianId,
          actualHours: { not: null },
          updatedAt: {
            gte: startOfThisWeek,
            lte: endOfToday
          }
        },
        _sum: {
          actualHours: true
        }
      }),

      // Recent activity (last 10 service updates)
      prisma.service.findMany({
        where: {
          assignedTo: technicianId,
          updatedAt: {
            gte: subDays(today, 7)
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      }),

      // Upcoming services (next 7 days)
      prisma.service.findMany({
        where: {
          assignedTo: technicianId,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          scheduledDate: {
            gte: today,
            lte: subDays(today, -7)
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        },
        take: 5
      }),

      // Services grouped by status
      prisma.service.groupBy({
        by: ['status'],
        where: {
          assignedTo: technicianId
        },
        _count: {
          status: true
        }
      }),

      // Performance statistics for the last 30 days
      prisma.service.findMany({
        where: {
          assignedTo: technicianId,
          status: 'COMPLETED',
          updatedAt: {
            gte: last30Days
          },
          actualHours: { not: null },
          estimatedHours: { not: null }
        },
        select: {
          estimatedHours: true,
          actualHours: true,
          createdAt: true,
          updatedAt: true,
          priority: true
        }
      })
    ])

    // Calculate performance metrics
    const avgEstimatedHours = performanceStats.length > 0 
      ? performanceStats.reduce((sum, s) => sum + (s.estimatedHours || 0), 0) / performanceStats.length 
      : 0

    const avgActualHours = performanceStats.length > 0
      ? performanceStats.reduce((sum, s) => sum + (s.actualHours || 0), 0) / performanceStats.length
      : 0

    const efficiencyRate = avgEstimatedHours > 0 
      ? Math.round((avgEstimatedHours / avgActualHours) * 100) 
      : 0

    // Calculate average completion time in days
    const avgCompletionDays = performanceStats.length > 0
      ? performanceStats.reduce((sum, s) => {
          const days = Math.ceil((new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / performanceStats.length
      : 0

    // Process status counts into a more usable format
    const statusCounts = servicesByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    // Get priority distribution for assigned services
    const priorityStats = await prisma.service.groupBy({
      by: ['priority'],
      where: {
        assignedTo: technicianId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ON_HOLD'] }
      },
      _count: {
        priority: true
      }
    })

    const priorityCounts = priorityStats.reduce((acc, item) => {
      acc[item.priority] = item._count.priority
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        assignedServices,
        todayServicesCount: todayServices.length,
        weekServices,
        completedThisMonth,
        totalHoursThisWeek: totalHoursThisWeek._sum.actualHours || 0,
        efficiencyRate,
        avgCompletionDays: Math.round(avgCompletionDays * 10) / 10
      },
      todayServices,
      upcomingServices,
      recentActivity,
      statusCounts,
      priorityCounts,
      technician: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      }
    })
  } catch (error) {
    console.error('Error fetching technician dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}