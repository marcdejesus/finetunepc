import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { orderId } = await params
    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { position: 'asc' },
                  take: 1,
                }
              }
            }
          }
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { orderId } = await params
    const { status, trackingNumber, adminNotes } = await request.json()
    
    // Check if user is admin or if it's their order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: session.user.id },
          // Admin can update any order
          ...(session.user.role === 'ADMIN' ? [{}] : [])
        ]
      }
    })
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (trackingNumber) updateData.trackingNumber = trackingNumber
    if (adminNotes && session.user.role === 'ADMIN') updateData.adminNotes = adminNotes
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { position: 'asc' },
                  take: 1,
                }
              }
            }
          }
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })
    
    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
} 