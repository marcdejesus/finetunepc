import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') as Role | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    const where = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ]
        } : {},
        role ? { role } : {}
      ]
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          phone: true,
          dateOfBirth: true,
          createdAt: true,
          updatedAt: true,
          emailVerified: true,
          _count: {
            select: {
              orders: true,
              services: true,
              reviews: true,
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      users,
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
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    if (!Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get the user's current role before updating
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, name: true }
    })

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      }
    })

    // Log the role change activity
    await logActivity({
      userId: session.user.id, // The admin who made the change
      action: 'ROLE_CHANGE',
      resource: 'user',
      resourceId: userId,
      details: {
        targetUser: {
          id: userId,
          email: updatedUser.email,
          name: updatedUser.name
        },
        previousRole: currentUser?.role,
        newRole: role,
        changedBy: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        }
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}