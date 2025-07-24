import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateOrderStatusSchema = z.object({
  orderIds: z.array(z.string()),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().optional(),
  shippingMethod: z.string().optional(),
  notes: z.string().optional(),
})

// GET - Fetch orders with admin details
export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN_ORDERS_GET] Starting orders fetch...')
    
    const session = await auth()
    console.log(`[ADMIN_ORDERS_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_ORDERS_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search') // customer name or email
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Build orderBy
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    select: {
                      url: true,
                      altText: true
                    },
                    take: 1,
                    orderBy: { position: 'asc' }
                  }
                }
              }
            }
          },
          shippingAddress: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Calculate order insights
    const [
      pendingCount,
      processingCount,
      shippedCount,
      totalRevenue,
      todayOrders,
      averageOrderValue
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { total: true }
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.order.aggregate({
        _avg: { total: true }
      })
    ])

    // Convert Decimal fields to numbers for frontend consumption
    const ordersWithNumbers = orders.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price)
      }))
    }))

    console.log(`[ADMIN_ORDERS_GET] Successfully fetched ${orders.length} orders for page ${page}`)
    console.log(`[ADMIN_ORDERS_GET] Total orders: ${totalCount}, Revenue: ${Number(totalRevenue._sum.total || 0)}`)

    return NextResponse.json({
      orders: ordersWithNumbers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      insights: {
        pendingCount,
        processingCount,
        shippedCount,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        todayOrders,
        averageOrderValue: Number(averageOrderValue._avg.total || 0),
        totalOrders: totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update order status (bulk operation)
export async function PATCH(request: NextRequest) {
  try {
    console.log('[ADMIN_ORDERS_PATCH] Updating order status...')
    
    const session = await auth()
    console.log(`[ADMIN_ORDERS_PATCH] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_ORDERS_PATCH] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_ORDERS_PATCH] Request body:', JSON.stringify(body, null, 2))
    
    const validatedData = updateOrderStatusSchema.parse(body)
    console.log('[ADMIN_ORDERS_PATCH] Validated data:', JSON.stringify(validatedData, null, 2))

    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    }

    if (validatedData.trackingNumber) {
      updateData.trackingNumber = validatedData.trackingNumber
    }

    if (validatedData.shippingMethod) {
      updateData.shippingMethod = validatedData.shippingMethod
    }

    if (validatedData.notes) {
      updateData.adminNotes = validatedData.notes
    }

    const updatedOrders = await prisma.order.updateMany({
      where: {
        id: {
          in: validatedData.orderIds
        }
      },
      data: updateData
    })

    // If status is SHIPPED, send notification emails
    if (validatedData.status === 'SHIPPED') {
      const orders = await prisma.order.findMany({
        where: {
          id: { in: validatedData.orderIds }
        },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })

      // TODO: Send shipping notification emails
      for (const order of orders) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/emails/order-shipped`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId: order.id,
              userEmail: order.user.email,
              userName: order.user.name,
              trackingNumber: validatedData.trackingNumber
            })
          })
        } catch (emailError) {
          console.error('Error sending shipping email:', emailError)
        }
      }
    }

    return NextResponse.json({
      message: `Updated ${updatedOrders.count} orders`,
      updatedCount: updatedOrders.count
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add admin notes to order
export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN_ORDERS_POST] Adding admin notes...')
    
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, notes } = body

    if (!orderId || !notes) {
      return NextResponse.json({ error: 'Order ID and notes are required' }, { status: 400 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        adminNotes: notes,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  select: {
                    url: true,
                    altText: true
                  },
                  take: 1,
                  orderBy: { position: 'asc' }
                }
              }
            }
          }
        },
        shippingAddress: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true
          }
        }
      }
    })

    // Convert Decimal fields to numbers
    const orderWithNumbers = {
      ...updatedOrder,
      subtotal: Number(updatedOrder.subtotal),
      tax: Number(updatedOrder.tax),
      shipping: Number(updatedOrder.shipping),
      discount: Number(updatedOrder.discount),
      total: Number(updatedOrder.total),
      items: updatedOrder.items.map(item => ({
        ...item,
        price: Number(item.price)
      }))
    }

    return NextResponse.json({
      message: 'Admin notes added successfully',
      order: orderWithNumbers
    })
  } catch (error) {
    console.error('Error adding admin notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 