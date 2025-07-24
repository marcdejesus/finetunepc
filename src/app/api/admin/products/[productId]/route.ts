import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  price: z.number().positive('Price must be positive').optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative').optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  featured: z.boolean().optional(),
})

// GET - Fetch individual product with admin details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    console.log(`[ADMIN_PRODUCT_GET] Fetching product: ${productId}`)
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCT_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCT_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            position: true
          },
          orderBy: { position: 'asc' }
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            order: {
              select: {
                id: true,
                createdAt: true,
                status: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            orderItems: true,
            cartItems: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Calculate sales metrics
    const salesMetrics = await prisma.orderItem.aggregate({
      where: {
        productId: productId,
        order: {
          status: OrderStatus.DELIVERED
        }
      },
      _sum: {
        quantity: true
      },
      _count: {
        id: true
      }
    })

    const revenue = await prisma.orderItem.findMany({
      where: {
        productId: productId,
        order: {
          status: OrderStatus.DELIVERED
        }
      },
      select: {
        quantity: true,
        price: true
      }
    })

    const totalRevenue = revenue.reduce((sum, item) => {
      return sum + (Number(item.price) * item.quantity)
    }, 0)

    // Convert Decimal fields to numbers for frontend consumption
    const productWithNumbers = {
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
    }

    console.log(`[ADMIN_PRODUCT_GET] Successfully fetched product: ${product.name}`)
    console.log(`[ADMIN_PRODUCT_GET] Metrics - Sold: ${salesMetrics._sum.quantity}, Revenue: ${totalRevenue}`)

    return NextResponse.json({
      product: productWithNumbers,
      metrics: {
        totalSold: salesMetrics._sum.quantity || 0,
        totalOrders: salesMetrics._count || 0,
        totalRevenue,
        currentStock: product.stock,
        inCart: product._count.cartItems
      }
    })
  } catch (error) {
    console.error('Error fetching admin product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    console.log(`[ADMIN_PRODUCT_PATCH] Updating product: ${productId}`)
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCT_PATCH] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCT_PATCH] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_PRODUCT_PATCH] Request body:', JSON.stringify(body, null, 2))
    
    const validatedData = updateProductSchema.parse(body)
    console.log('[ADMIN_PRODUCT_PATCH] Validated data:', JSON.stringify(validatedData, null, 2))

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // If updating slug, check for conflicts
    if (validatedData.slug && validatedData.slug !== existingProduct.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: { slug: validatedData.slug }
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: validatedData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            position: true
          },
          orderBy: { position: 'asc' }
        }
      }
    })

    // Convert Decimal fields to numbers for frontend consumption
    const productWithNumbers = {
      ...updatedProduct,
      price: Number(updatedProduct.price),
      comparePrice: updatedProduct.comparePrice ? Number(updatedProduct.comparePrice) : null,
      costPrice: updatedProduct.costPrice ? Number(updatedProduct.costPrice) : null,
    }

    console.log(`[ADMIN_PRODUCT_PATCH] Successfully updated product: ${updatedProduct.name}`)

    return NextResponse.json({ product: productWithNumbers })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    console.log(`[ADMIN_PRODUCT_DELETE] Deleting product: ${productId}`)
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCT_DELETE] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCT_DELETE] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if product has orders (prevent deletion if it has order history)
    const orderCount = await prisma.orderItem.count({
      where: { productId: productId }
    })

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing orders. Consider marking as inactive instead.' },
        { status: 400 }
      )
    }

    // Delete related data first
    await prisma.$transaction(async (tx) => {
      // Delete cart items
      await tx.cartItem.deleteMany({
        where: { productId: productId }
      })

      // Delete product images
      await tx.productImage.deleteMany({
        where: { productId: productId }
      })

      // Delete the product
      await tx.product.delete({
        where: { id: productId }
      })
    })

    console.log(`[ADMIN_PRODUCT_DELETE] Successfully deleted product: ${productId}`)

    return NextResponse.json({ 
      message: 'Product deleted successfully',
      productId 
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 