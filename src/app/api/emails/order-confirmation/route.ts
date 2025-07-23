import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
    
    // Calculate estimated delivery date
    const estimatedDelivery = new Date(order.createdAt)
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5)
    
    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - Fine Tune PC</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
            .item:last-child { border-bottom: none; }
            .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #2563eb; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Fine Tune PC</h1>
              <p>Order Confirmation</p>
            </div>
            
            <div class="content">
              <div style="text-align: center; margin: 20px 0;">
                <span class="success-badge">✓ Order Confirmed</span>
              </div>
              
              <p>Hi ${order.user.name || 'Customer'},</p>
              <p>Thank you for your order! We've received your payment and are preparing your items for shipment.</p>
              
              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Estimated Delivery:</strong> ${estimatedDelivery.toLocaleDateString()}</p>
                
                <h4>Items Ordered:</h4>
                                 ${order.items.map((item: any) => `
                  <div class="item">
                    <div style="flex: 1;">
                      <strong>${item.product.name}</strong><br>
                      <small>Quantity: ${item.quantity}</small>
                    </div>
                    <div>
                      $${(Number(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                `).join('')}
                
                <div class="totals">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Subtotal:</span>
                    <span>$${Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Shipping:</span>
                    <span>${Number(order.shipping) === 0 ? 'Free' : '$' + Number(order.shipping).toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>Tax:</span>
                    <span>$${Number(order.tax).toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold; font-size: 18px;">
                    <span>Total:</span>
                    <span>$${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div class="order-details">
                <h4>Shipping Address</h4>
                <p>
                  ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                  ${order.shippingAddress.company ? order.shippingAddress.company + '<br>' : ''}
                  ${order.shippingAddress.addressLine1}<br>
                  ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
                  ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
                  ${order.shippingAddress.country}
                </p>
              </div>
              
              <p>We'll send you another email with tracking information once your order ships.</p>
              <p>If you have any questions about your order, please contact us at support@finetunepc.com</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing Fine Tune PC!</p>
              <p>© 2024 Fine Tune PC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Send email
    try {
      const emailResponse = await resend.emails.send({
        from: 'Fine Tune PC <orders@finetunepc.com>',
        to: [order.user.email],
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: emailHtml,
        text: `
          Order Confirmation - Fine Tune PC
          
          Hi ${order.user.name || 'Customer'},
          
          Thank you for your order! We've received your payment and are preparing your items for shipment.
          
          Order Number: ${order.orderNumber}
          Order Date: ${new Date(order.createdAt).toLocaleDateString()}
          Estimated Delivery: ${estimatedDelivery.toLocaleDateString()}
          
          Order Total: $${Number(order.total).toFixed(2)}
          
          We'll send you tracking information once your order ships.
          
          Thank you for choosing Fine Tune PC!
        `
      })
      
      return NextResponse.json({
        success: true,
        emailId: emailResponse.data?.id,
        message: 'Order confirmation email sent successfully'
      })
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in order confirmation email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 