import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityAction } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action') as ActivityAction | null
    const resource = searchParams.get('resource')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (userId) {
      where.userId = userId
    }
    
    if (action) {
      where.action = action
    }
    
    if (resource) {
      where.resource = { contains: resource, mode: 'insensitive' }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            }
          }
        },
        orderBy: {
          createdAt: sortOrder as 'asc' | 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, resource, resourceId, details, ipAddress, userAgent } = await request.json()

    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Action and resource are required' },
        { status: 400 }
      )
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          }
        }
      }
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}