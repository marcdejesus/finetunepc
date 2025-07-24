import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const reviewImportSchema = z.object({
  reviews: z.array(z.object({
    productId: z.string().optional(),
    productSku: z.string().optional(),
    productSlug: z.string().optional(),
    userEmail: z.string().email('Invalid email format'),
    userName: z.string().optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().optional(),
    comment: z.string().optional(),
    verified: z.boolean().optional().default(false),
    helpful: z.number().int().min(0).optional().default(0),
    isVisible: z.boolean().optional().default(true),
    createdAt: z.string().optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    console.log('[REVIEW_IMPORT] Starting review import process...')
    
    const session = await auth()
    console.log(`[REVIEW_IMPORT] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[REVIEW_IMPORT] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log(`[REVIEW_IMPORT] Processing ${body.reviews?.length || 0} reviews`)
    
    const validatedData = reviewImportSchema.parse(body)
    const { reviews } = validatedData

    let successful = 0
    let failed = 0
    let duplicates = 0
    const errors: string[] = []

    // Process reviews in batches for better performance
    const batchSize = 10
    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (reviewData, batchIndex) => {
        const reviewIndex = i + batchIndex
        
        try {
          console.log(`[REVIEW_IMPORT] Processing review ${reviewIndex + 1}: ${reviewData.userEmail}`)
          
          // Find or create product
          let productId = reviewData.productId
          
          if (!productId) {
            let product = null
            
            if (reviewData.productSku) {
              product = await prisma.product.findUnique({
                where: { sku: reviewData.productSku }
              })
            } else if (reviewData.productSlug) {
              product = await prisma.product.findUnique({
                where: { slug: reviewData.productSlug }
              })
            }
            
            if (!product) {
              throw new Error(`Product not found for review ${reviewIndex + 1}`)
            }
            
            productId = product.id
          } else {
            // Verify productId exists
            const product = await prisma.product.findUnique({
              where: { id: productId }
            })
            
            if (!product) {
              throw new Error(`Product with ID ${productId} not found for review ${reviewIndex + 1}`)
            }
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email: reviewData.userEmail }
          })

          if (!user) {
            console.log(`[REVIEW_IMPORT] Creating new user: ${reviewData.userEmail}`)
            user = await prisma.user.create({
              data: {
                email: reviewData.userEmail,
                name: reviewData.userName || reviewData.userEmail.split('@')[0],
                role: 'USER'
              }
            })
          }

          // Check for existing review (one review per user per product)
          const existingReview = await prisma.review.findUnique({
            where: {
              productId_userId: {
                productId: productId,
                userId: user.id
              }
            }
          })

          if (existingReview) {
            console.log(`[REVIEW_IMPORT] Duplicate review found for ${reviewData.userEmail} on product ${productId}`)
            duplicates++
            return
          }

          // Create the review
          const reviewToCreate = {
            productId: productId,
            userId: user.id,
            rating: reviewData.rating,
            title: reviewData.title || null,
            comment: reviewData.comment || null,
            verified: reviewData.verified || false,
            helpful: reviewData.helpful || 0,
            isVisible: reviewData.isVisible !== false,
            ...(reviewData.createdAt && { 
              createdAt: new Date(reviewData.createdAt),
              updatedAt: new Date(reviewData.createdAt)
            })
          }

          await prisma.review.create({
            data: reviewToCreate
          })

          console.log(`[REVIEW_IMPORT] Successfully created review ${reviewIndex + 1}`)
          successful++
          
        } catch (error) {
          console.error(`[REVIEW_IMPORT] Error processing review ${reviewIndex + 1}:`, error)
          errors.push(`Review ${reviewIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          failed++
        }
      }))
    }

    console.log(`[REVIEW_IMPORT] Import completed: ${successful} successful, ${failed} failed, ${duplicates} duplicates`)

    return NextResponse.json({
      successful,
      failed,
      duplicates,
      total: reviews.length,
      errors: failed > 0 ? errors : undefined
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[REVIEW_IMPORT] Validation error:', error.errors)
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors,
          message: 'Please check your review data format'
        },
        { status: 400 }
      )
    }

    console.error('[REVIEW_IMPORT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 