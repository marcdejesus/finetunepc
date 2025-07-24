import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ServiceStatus, Priority } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const updateServiceSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  assignedTo: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  scheduledDate: z.string().datetime().optional(),
  actualHours: z.number().positive().optional(),
  partsUsed: z.array(z.string()).optional(),
  notes: z.string().optional(),
  completionNotes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await auth()
    const { serviceId } = await params
    
    if (!session?.user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            addresses: {
              select: {
                id: true,
                street: true,
                city: true,
                state: true,
                zipCode: true,
                type: true
              }
            }
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            phone: true
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // If technician, only allow access to their assigned services
    if (session.user.role === 'TECHNICIAN' && service.assignedTo !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await auth()
    const { serviceId } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateServiceSchema.parse(body)

    // Get current service data for comparison
    const currentService = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        user: { select: { name: true, email: true } },
        assignedUser: { select: { name: true, email: true } }
      }
    })

    if (!currentService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Authorization checks
    const canManage = ['ADMIN', 'MANAGER'].includes(session.user.role)
    const isAssignedTechnician = session.user.role === 'TECHNICIAN' && currentService.assignedTo === session.user.id

    if (!canManage && !isAssignedTechnician) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Technicians can only update certain fields
    if (session.user.role === 'TECHNICIAN') {
      const allowedFields = ['status', 'actualHours', 'partsUsed', 'notes', 'completionNotes']
      const techUpdates: any = {}
      
      for (const [key, value] of Object.entries(validatedData)) {
        if (allowedFields.includes(key)) {
          techUpdates[key] = value
        }
      }
      
      // Technicians can only transition to certain statuses
      if (techUpdates.status && !['IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].includes(techUpdates.status)) {
        return NextResponse.json(
          { error: 'Technicians can only set status to IN_PROGRESS, COMPLETED, or ON_HOLD' },
          { status: 403 }
        )
      }
      
      Object.assign(validatedData, techUpdates)
    }

    // Convert scheduledDate string to Date if provided
    const updateData: any = { ...validatedData }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate)
    }

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true
          }
        }
      }
    })

    // Log the activity
    const changes: any = {}
    const previousValues: any = {}

    for (const [key, newValue] of Object.entries(updateData)) {
      const currentValue = (currentService as any)[key]
      if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        changes[key] = newValue
        previousValues[key] = currentValue
      }
    }

    if (Object.keys(changes).length > 0) {
      await logActivity({
        userId: session.user.id,
        action: 'SERVICE_UPDATE',
        resource: 'service',
        resourceId: serviceId,
        details: {
          serviceTitle: currentService.title,
          customer: currentService.user,
          changes,
          previousValues,
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role
          }
        }
      })

      // Send notifications for significant changes
      if (changes.status || changes.assignedTo || changes.scheduledDate) {
        // TODO: Send email notifications to customer and/or technician
        console.log('Service update notification needed:', {
          serviceId,
          changes,
          customer: currentService.user.email
        })
      }
    }

    return NextResponse.json({ service: updatedService })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await auth()
    const { serviceId } = await params
    
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        user: { select: { name: true, email: true } }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Only allow deletion of cancelled services or pending services
    if (!['CANCELLED', 'PENDING'].includes(service.status)) {
      return NextResponse.json(
        { error: 'Only cancelled or pending services can be deleted' },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id: serviceId }
    })

    // Log the deletion
    await logActivity({
      userId: session.user.id,
      action: 'SERVICE_DELETE',
      resource: 'service',
      resourceId: serviceId,
      details: {
        serviceTitle: service.title,
        customer: service.user,
        deletedBy: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        }
      }
    })

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}