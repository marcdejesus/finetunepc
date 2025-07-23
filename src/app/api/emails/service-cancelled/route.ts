import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { serviceId, userEmail, userName } = await request.json()

    if (!serviceId || !userEmail) {
      return NextResponse.json(
        { error: 'Service ID and user email are required' },
        { status: 400 }
      )
    }

    // Fetch service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    const serviceTypeNames = {
      REPAIR: 'Repair Service',
      UPGRADE: 'Upgrade Service',
      CONSULTATION: 'Consultation',
      INSTALLATION: 'Installation Service',
      MAINTENANCE: 'Maintenance Service',
      DIAGNOSTICS: 'Diagnostics Service'
    }

    const formattedDate = service.scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const formattedTime = service.scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Booking Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .service-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
            .cancellation-notice { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Service Booking Cancelled</h1>
            <p>Your appointment has been successfully cancelled</p>
          </div>
          
          <div class="content">
            <p>Dear ${userName || 'Valued Customer'},</p>
            
            <div class="cancellation-notice">
              <h4>Cancellation Confirmed</h4>
              <p>Your ${serviceTypeNames[service.type]} appointment has been cancelled as requested. No charges will be applied for this cancellation.</p>
            </div>
            
            <div class="service-details">
              <h3>Cancelled Service Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Service Type:</span>
                <span class="detail-value">${serviceTypeNames[service.type]}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Service Title:</span>
                <span class="detail-value">${service.title}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Original Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Original Time:</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #e74c3c; font-weight: bold;">CANCELLED</span>
              </div>
            </div>
            
            <p>We're sorry to see that you needed to cancel your appointment. If you'd like to reschedule or book a new service in the future, we're here to help.</p>
            
            <a href="${process.env.NEXTAUTH_URL}/services/book" class="button">Book New Service</a>
            
            <p>If you have any questions about this cancellation or need assistance with anything else, please don't hesitate to contact us.</p>
            
            <p>Thank you for considering Fine Tune PC for your computer service needs!</p>
          </div>
          
          <div class="footer">
            <p><strong>Fine Tune PC</strong><br>
            Professional Computer Services<br>
            Email: support@finetunepc.com | Phone: (555) 123-4567</p>
            
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: 'Fine Tune PC <noreply@finetunepc.com>',
      to: [userEmail],
      subject: `Service Booking Cancelled - ${serviceTypeNames[service.type]}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    console.error('Error sending service cancellation email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 