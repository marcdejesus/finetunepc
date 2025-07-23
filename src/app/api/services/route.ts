import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createServiceSchema = z.object({
  type: z.enum(['REPAIR', 'UPGRADE', 'CONSULTATION', 'INSTALLATION', 'MAINTENANCE', 'DIAGNOSTICS']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  scheduledDate: z.string().transform((str) => new Date(str)),
  deviceInfo: z.object({
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    warrantyStatus: z.string().optional(),
  }).optional(),
  issueDetails: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

// GET - Fetch user's services
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    // Get services with pagination
    const [services, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
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
      }),
      prisma.service.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      services,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new service booking
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createServiceSchema.parse(body)

    // Check if the scheduled date is in the future
    if (validatedData.scheduledDate < new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      )
    }

    // Calculate estimated price based on service type
    const priceMap = {
      REPAIR: 75,
      UPGRADE: 100,
      CONSULTATION: 50,
      INSTALLATION: 80,
      MAINTENANCE: 60,
      DIAGNOSTICS: 45
    }

    const estimatedPrice = priceMap[validatedData.type]

    // Create the service
    const service = await prisma.service.create({
      data: {
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        scheduledDate: validatedData.scheduledDate,
        userId: session.user.id,
        price: estimatedPrice,
        priority: validatedData.priority,
        deviceInfo: validatedData.deviceInfo || null,
        issueDetails: validatedData.issueDetails || null,
        status: 'PENDING'
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

    // TODO: Send confirmation email
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/emails/service-confirmation`, {
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
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 