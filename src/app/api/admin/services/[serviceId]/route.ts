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
    console.log(`🔍 SERVICE_GET: API route called for service details`)
    
    const session = await auth()
    const { serviceId } = await params
    
    console.log(`🔍 SERVICE_GET: Session check - User: ${session?.user?.id}, Role: ${session?.user?.role}, Service: ${serviceId}`)
    
    if (!session?.user) {
      console.log(`🚫 SERVICE_GET: No session found`)
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      console.log(`🚫 SERVICE_GET: Unauthorized - user role: ${session?.user?.role}`)
      return NextResponse.json({ error: 'Unauthorized - Invalid role' }, { status: 401 })
    }
    
    console.log(`✅ SERVICE_GET: User authorized to access service API`)

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
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
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
      console.log(`🚫 SERVICE_GET: Service ${serviceId} not found`)
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    console.log(`🔍 SERVICE_GET: Found service ${serviceId}, assignedTo: ${service.assignedTo}`)

    // If technician, only allow access to their assigned services
    if (session.user.role === 'TECHNICIAN' && service.assignedTo !== session.user.id) {
      console.log(`🚫 SERVICE_GET: Technician ${session.user.id} denied access to service ${serviceId} (assigned to ${service.assignedTo})`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log(`✅ SERVICE_GET: Access granted for ${session.user.role} ${session.user.id} to service ${serviceId}`)

    // Map database field names to API field names for frontend compatibility
    const serviceWithMappedFields = {
      ...service,
      notes: service.issueDetails,
      completionNotes: service.resolution
    }

    return NextResponse.json({ service: serviceWithMappedFields })
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
      
      // Technicians can transition between work-related statuses
      if (techUpdates.status) {
        const currentStatus = currentService.status
        const newStatus = techUpdates.status
        
        // Define allowed transitions for technicians
        const allowedTransitions: Record<string, string[]> = {
          'PENDING': ['CONFIRMED', 'IN_PROGRESS'],
          'CONFIRMED': ['IN_PROGRESS', 'ON_HOLD'],
          'IN_PROGRESS': ['COMPLETED', 'ON_HOLD'],
          'ON_HOLD': ['IN_PROGRESS', 'CONFIRMED'],
          'COMPLETED': ['IN_PROGRESS'], // Allow reopening if needed
        }
        
        // Check if the transition is allowed
        const allowedNextStatuses = allowedTransitions[currentStatus] || []
        if (!allowedNextStatuses.includes(newStatus)) {
          return NextResponse.json(
            { 
              error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedNextStatuses.join(', ')}` 
            },
            { status: 403 }
          )
        }
      }
      
      Object.assign(validatedData, techUpdates)
    }

    // Convert scheduledDate string to Date if provided and map field names
    const updateData: any = { ...validatedData }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate)
    }
    
    // Map API field names to database field names
    if (updateData.notes !== undefined) {
      updateData.issueDetails = updateData.notes
      delete updateData.notes
    }
    if (updateData.completionNotes !== undefined) {
      updateData.resolution = updateData.completionNotes
      delete updateData.completionNotes
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

    // Map database field names to API field names for frontend compatibility
    const serviceWithMappedFields = {
      ...updatedService,
      notes: updatedService.issueDetails,
      completionNotes: updatedService.resolution
    }

    return NextResponse.json({ service: serviceWithMappedFields })
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
      action: 'SERVICE_CANCEL',
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