import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { orderId, paymentIntentId } = await request.json()
    
    // Validate order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
      }
    })
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // For demo purposes, we'll simulate a successful payment
    // In production, you would verify the payment with Stripe
    try {
      // Retrieve payment intent from Stripe to verify status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      
      // For demo, we'll mark as successful
      // In production, check: paymentIntent.status === 'succeeded'
      const paymentSuccessful = true // Demo mode
      
      if (paymentSuccessful) {
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            paymentMethod: 'card',
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            shippingAddress: true,
            user: true,
          }
        })
        
        // Update product stock
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          })
        }
        
        // Send order confirmation email (we'll implement this next)
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/emails/order-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: updatedOrder.id }),
          })
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError)
          // Don't fail the order if email fails
        }
        
        return NextResponse.json({
          success: true,
          order: updatedOrder,
          message: 'Payment confirmed successfully'
        })
      } else {
        // Payment failed
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'FAILED',
          }
        })
        
        return NextResponse.json(
          { error: 'Payment failed' },
          { status: 400 }
        )
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError)
      
      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
        }
      })
      
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
} 