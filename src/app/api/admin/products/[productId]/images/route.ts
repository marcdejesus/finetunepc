import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createImagesSchema = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    altText: z.string().optional(),
    position: z.number().int().min(0)
  }))
})

const reorderImagesSchema = z.object({
  imageOrders: z.array(z.object({
    id: z.string(),
    position: z.number().int().min(0)
  }))
})

// POST - Add new images to product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    const body = await request.json()
    const validatedData = createImagesSchema.parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Create images
    const createdImages = await Promise.all(
      validatedData.images.map(imageData =>
        prisma.productImage.create({
          data: {
            productId,
            url: imageData.url,
            altText: imageData.altText || '',
            position: imageData.position
          }
        })
      )
    )

    return NextResponse.json({ images: createdImages }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating product images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Reorder images
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    const body = await request.json()
    
    // Check if this is a reorder request
    if (body.imageOrders) {
      const validatedData = reorderImagesSchema.parse(body)

      // Update positions in batch
      await Promise.all(
        validatedData.imageOrders.map(({ id, position }) =>
          prisma.productImage.update({
            where: { id, productId },
            data: { position }
          })
        )
      )

      return NextResponse.json({ message: 'Images reordered successfully' })
    }

    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 