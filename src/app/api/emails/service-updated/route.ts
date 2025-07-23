import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { serviceId, userEmail, userName, updateType } = await request.json()

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

    const updateTypeText = updateType === 'reschedule' ? 'Rescheduled' : 'Updated'

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Booking ${updateTypeText}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .service-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .button { display: inline-block; background: #f39c12; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
            .update-notice { background: #e8f4fd; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Service Booking ${updateTypeText}</h1>
            <p>Your service appointment has been updated</p>
          </div>
          
          <div class="content">
            <p>Dear ${userName || 'Valued Customer'},</p>
            
            <div class="update-notice">
              <h4>Update Notice</h4>
              <p>Your ${serviceTypeNames[service.type]} appointment has been ${updateType === 'reschedule' ? 'rescheduled' : 'updated'} as requested. Please see the updated details below.</p>
            </div>
            
            <div class="service-details">
              <h3>Updated Service Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Service Type:</span>
                <span class="detail-value">${serviceTypeNames[service.type]}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Service Title:</span>
                <span class="detail-value">${service.title}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">New Scheduled Date:</span>
                <span class="detail-value"><strong>${formattedDate}</strong></span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">New Scheduled Time:</span>
                <span class="detail-value"><strong>${formattedTime}</strong></span>
              </div>
              
              ${service.price ? `
              <div class="detail-row">
                <span class="detail-label">Estimated Cost:</span>
                <span class="detail-value">$${service.price}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${service.description}</span>
              </div>
            </div>
            
            <p>Please make note of your new appointment time. If you need to make any further changes, please do so at least 24 hours in advance.</p>
            
            <a href="${process.env.NEXTAUTH_URL}/services" class="button">View My Services</a>
            
            <p>If you have any questions about this update, please don't hesitate to contact us.</p>
            
            <p>Thank you for choosing Fine Tune PC!</p>
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
      subject: `Service ${updateTypeText} - ${serviceTypeNames[service.type]} on ${formattedDate}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    console.error('Error sending service update email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 