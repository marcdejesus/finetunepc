import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  categoryId: z.string().min(1, 'Category is required'),
  specifications: z.record(z.any()).optional(),
  featured: z.boolean().default(false),
})

const updateProductSchema = createProductSchema.partial()

const bulkUpdateSchema = z.object({
  productIds: z.array(z.string()),
  updates: z.object({
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    featured: z.boolean().optional(),
    categoryId: z.string().optional(),
  })
})

// GET - Fetch products with admin details
export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN_PRODUCTS_GET] Starting products fetch...')
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCTS_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCTS_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status') // 'active', 'low-stock', 'out-of-stock'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.categoryId = category
    }

    if (status) {
      switch (status) {
        case 'low-stock':
          where.stock = { lte: 10, gt: 0 }
          break
        case 'out-of-stock':
          where.stock = { lte: 0 }
          break
        case 'active':
          where.stock = { gt: 0 }
          break
      }
    }

    // Build orderBy
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [products, totalCount, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          _count: {
            select: {
              orderItems: true,
              cartItems: true
            }
          }
        }
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: true
            }
          }
        }
      })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Calculate inventory insights
    const lowStockCount = await prisma.product.count({
      where: { stock: { lte: 10, gt: 0 } }
    })
    const outOfStockCount = await prisma.product.count({
      where: { stock: { lte: 0 } }
    })

    // Convert Decimal fields to numbers for frontend consumption
    const productsWithNumbers = products.map(product => ({
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
    }))

    console.log(`[ADMIN_PRODUCTS_GET] Successfully fetched ${products.length} products for page ${page}`)
    console.log(`[ADMIN_PRODUCTS_GET] Total products: ${totalCount}, Low stock: ${lowStockCount}, Out of stock: ${outOfStockCount}`)

    return NextResponse.json({
      products: productsWithNumbers,
      categories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      insights: {
        lowStockCount,
        outOfStockCount,
        totalProducts: totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching admin products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN_PRODUCTS_POST] Creating new product...')
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCTS_POST] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCTS_POST] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_PRODUCTS_POST] Request body:', JSON.stringify(body, null, 2))
    
    const validatedData = createProductSchema.parse(body)
    console.log('[ADMIN_PRODUCTS_POST] Validated data:', JSON.stringify(validatedData, null, 2))

    // Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
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

    // Convert Decimal fields to numbers
    const productWithNumbers = {
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
    }

    console.log(`[ADMIN_PRODUCTS_POST] Successfully created product: ${product.name} (${product.id})`)

    return NextResponse.json({ product: productWithNumbers }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Bulk update products
export async function PATCH(request: NextRequest) {
  try {
    console.log('[ADMIN_PRODUCTS_PATCH] Bulk updating products...')
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCTS_PATCH] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCTS_PATCH] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_PRODUCTS_PATCH] Request body:', JSON.stringify(body, null, 2))
    
    const validatedData = bulkUpdateSchema.parse(body)
    console.log('[ADMIN_PRODUCTS_PATCH] Validated data:', JSON.stringify(validatedData, null, 2))

    const updatedProducts = await prisma.product.updateMany({
      where: {
        id: {
          in: validatedData.productIds
        }
      },
      data: validatedData.updates
    })

    console.log(`[ADMIN_PRODUCTS_PATCH] Successfully updated ${updatedProducts.count} products`)

    return NextResponse.json({
      message: `Updated ${updatedProducts.count} products`,
      updatedCount: updatedProducts.count
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error bulk updating products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 