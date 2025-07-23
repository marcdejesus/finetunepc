import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateServiceSchema = z.object({
  scheduledDate: z.string().transform((str) => new Date(str)).optional(),
  description: z.string().min(10).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  deviceInfo: z.object({
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    warrantyStatus: z.string().optional(),
  }).optional(),
  issueDetails: z.string().optional(),
})

// GET - Fetch individual service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update service (reschedule, update details)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateServiceSchema.parse(body)

    // Check if service exists and belongs to user
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: session.user.id
      }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Check if service can be updated (not completed or cancelled)
    if (existingService.status === 'COMPLETED' || existingService.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot update completed or cancelled service' },
        { status: 400 }
      )
    }

    // Validate scheduled date if provided
    if (validatedData.scheduledDate && validatedData.scheduledDate < new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      )
    }

    // Update the service
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Send update notification email if rescheduled
    if (validatedData.scheduledDate) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/emails/service-updated`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            serviceId: service.id,
            userEmail: session.user.email,
            userName: session.user.name,
            updateType: 'reschedule'
          })
        })
      } catch (emailError) {
        console.error('Error sending update email:', emailError)
      }
    }

    return NextResponse.json({ service })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if service exists and belongs to user
    const existingService = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: session.user.id
      }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Check if service can be cancelled
    if (existingService.status === 'COMPLETED' || existingService.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled service' },
        { status: 400 }
      )
    }

    // Check if cancellation is allowed (e.g., at least 24 hours before scheduled date)
    const hoursUntilService = (existingService.scheduledDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)
    if (hoursUntilService < 24) {
      return NextResponse.json(
        { error: 'Cannot cancel service less than 24 hours before scheduled time' },
        { status: 400 }
      )
    }

    // Update service status to cancelled
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Send cancellation email
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/emails/service-cancelled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: service.id,
          userEmail: session.user.email,
          userName: session.user.name
        })
      })
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError)
    }

    return NextResponse.json({ 
      message: 'Service cancelled successfully',
      service 
    })
  } catch (error) {
    console.error('Error cancelling service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 