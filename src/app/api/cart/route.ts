import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] })
    }
    
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
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
        }
      }
    })
    
    return NextResponse.json({
      items: cart?.items || []
    })
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { items } = await request.json()
    
    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })
    
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id }
      })
    }
    
    // Clear existing items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    })
    
    // Add new items
    if (items && items.length > 0) {
      await prisma.cartItem.createMany({
        data: items.map((item: any) => ({
          cartId: cart.id,
          productId: item.productId,
          quantity: item.quantity,
        }))
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error syncing cart:', error)
    return NextResponse.json(
      { error: 'Failed to sync cart' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { productId, quantity } = await request.json()
    
    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })
    
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id }
      })
    }
    
    if (quantity <= 0) {
      // Remove item
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
        }
      })
    } else {
      // Update or create item
      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          }
        },
        update: { quantity },
        create: {
          cartId: cart.id,
          productId,
          quantity,
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating cart item:', error)
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    )
  }
} 