import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateReviewSchema = z.object({
  title: z.string().optional(),
  comment: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  verified: z.boolean().optional(),
  helpful: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional()
})

// PATCH - Update review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    console.log('[ADMIN_REVIEW_PATCH] Starting review update...')
    
    const session = await auth()
    console.log(`[ADMIN_REVIEW_PATCH] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_REVIEW_PATCH] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId } = await params
    const body = await request.json()
    console.log(`[ADMIN_REVIEW_PATCH] Updating review ${reviewId} with data:`, body)
    
    const validatedData = updateReviewSchema.parse(body)

    // Verify review exists
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: validatedData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log(`[ADMIN_REVIEW_PATCH] Successfully updated review ${reviewId}`)

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ADMIN_REVIEW_PATCH] Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('[ADMIN_REVIEW_PATCH] Error updating review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    console.log('[ADMIN_REVIEW_DELETE] Starting review deletion...')
    
    const session = await auth()
    console.log(`[ADMIN_REVIEW_DELETE] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_REVIEW_DELETE] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId } = await params
    console.log(`[ADMIN_REVIEW_DELETE] Deleting review ${reviewId}`)

    // Verify review exists
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Delete review
    await prisma.review.delete({
      where: { id: reviewId }
    })

    console.log(`[ADMIN_REVIEW_DELETE] Successfully deleted review ${reviewId} from product ${existingReview.product.name}`)

    return NextResponse.json({ 
      message: 'Review deleted successfully',
      deletedReview: {
        id: existingReview.id,
        productName: existingReview.product.name,
        userEmail: existingReview.user.email
      }
    })
  } catch (error) {
    console.error('[ADMIN_REVIEW_DELETE] Error deleting review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get single review details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    console.log('[ADMIN_REVIEW_GET] Starting review fetch...')
    
    const session = await auth()
    console.log(`[ADMIN_REVIEW_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_REVIEW_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId } = await params
    console.log(`[ADMIN_REVIEW_GET] Fetching review ${reviewId}`)

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: {
                url: true,
                altText: true
              },
              orderBy: { position: 'asc' },
              take: 1
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      }
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    console.log(`[ADMIN_REVIEW_GET] Successfully fetched review ${reviewId}`)

    return NextResponse.json({ review })
  } catch (error) {
    console.error('[ADMIN_REVIEW_GET] Error fetching review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 