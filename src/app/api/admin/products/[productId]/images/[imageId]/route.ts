import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateImageSchema = z.object({
  altText: z.string().optional(),
  position: z.number().int().min(0).optional()
})

// PATCH - Update image details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, imageId } = await params
    const body = await request.json()
    const validatedData = updateImageSchema.parse(body)

    // Verify image exists and belongs to product
    const existingImage = await prisma.productImage.findFirst({
      where: { 
        id: imageId,
        productId: productId 
      }
    })

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Update image
    const updatedImage = await prisma.productImage.update({
      where: { id: imageId },
      data: validatedData
    })

    return NextResponse.json({ image: updatedImage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, imageId } = await params

    // Verify image exists and belongs to product
    const existingImage = await prisma.productImage.findFirst({
      where: { 
        id: imageId,
        productId: productId 
      }
    })

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Delete image
    await prisma.productImage.delete({
      where: { id: imageId }
    })

    // Reorder remaining images to fill gaps
    const remainingImages = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' }
    })

    // Update positions to be sequential
    await Promise.all(
      remainingImages.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { position: index }
        })
      )
    )

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Error deleting product image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 