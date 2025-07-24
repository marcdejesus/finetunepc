import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const reorderImagesSchema = z.object({
  imageOrders: z.array(z.object({
    id: z.string(),
    position: z.number().int().min(0)
  }))
})

// PATCH - Reorder product images
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = params
    const body = await request.json()
    const validatedData = reorderImagesSchema.parse(body)

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

    // Update positions in a transaction to ensure consistency
    await prisma.$transaction(
      validatedData.imageOrders.map(({ id, position }) =>
        prisma.productImage.updateMany({
          where: { 
            id,
            productId // Ensure the image belongs to this product
          },
          data: { position }
        })
      )
    )

    return NextResponse.json({ 
      message: 'Images reordered successfully',
      updatedCount: validatedData.imageOrders.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error reordering product images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 