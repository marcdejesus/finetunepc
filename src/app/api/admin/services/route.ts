import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ServiceStatus, ServiceType, Priority } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ServiceStatus | 'ALL' | null
    const type = searchParams.get('type') as ServiceType | null
    const priority = searchParams.get('priority') as Priority | null
    const assignedTo = searchParams.get('assignedTo') || null
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (type) {
      where.type = type
    }
    
    if (priority) {
      where.priority = priority
    }
    
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        where.assignedTo = null
      } else {
        where.assignedTo = assignedTo
      }
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } }
      ]
    }

    // If user is technician, only show their assigned services
    if (session.user.role === 'TECHNICIAN') {
      where.assignedTo = session.user.id
    }

    const [services, totalCount, statusCounts] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
      prisma.service.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })
    ])

    // Get technician list for assignments
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNICIAN', 'MANAGER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        _count: {
          select: {
            assignedServices: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const statusCountsMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      services,
      technicians,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      statusCounts: statusCountsMap
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serviceIds, updates } = await request.json()

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Service IDs are required' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates are required' },
        { status: 400 }
      )
    }

    // Validate allowed update fields
    const allowedFields = ['status', 'assignedTo', 'priority', 'scheduledDate']
    const updateData: any = {}
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Get services before update for activity logging
    const servicesBeforeUpdate = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        title: true,
        status: true,
        assignedTo: true,
        priority: true,
        user: { select: { name: true, email: true } }
      }
    })

    // Perform bulk update
    const updatedServices = await prisma.service.updateMany({
      where: { id: { in: serviceIds } },
      data: updateData
    })

    // Log activity for each updated service
    await Promise.all(
      servicesBeforeUpdate.map(async (service) => {
        await logActivity({
          userId: session.user.id,
          action: 'SERVICE_UPDATE',
          resource: 'service',
          resourceId: service.id,
          details: {
            serviceTitle: service.title,
            customer: service.user,
            bulkUpdate: true,
            changes: updateData,
            previousValues: {
              status: service.status,
              assignedTo: service.assignedTo,
              priority: service.priority
            },
            updatedBy: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name
            }
          }
        })
      })
    )

    return NextResponse.json({
      message: `Successfully updated ${updatedServices.count} services`,
      updatedCount: updatedServices.count
    })
  } catch (error) {
    console.error('Error bulk updating services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}