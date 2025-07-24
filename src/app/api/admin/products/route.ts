import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().optional(),
  costPrice: z.number().optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  sku: z.string().optional(),
  weight: z.number().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  warranty: z.string().optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    altText: z.string(),
    position: z.number().int().min(0)
  })).optional().default([])
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
    console.log('[ADMIN_PRODUCTS_POST] ============ Creating new product ============')
    
    const session = await auth()
    console.log(`[ADMIN_PRODUCTS_POST] Session validation:`, {
      userExists: !!session?.user?.id,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      isAdmin: session?.user?.role === 'ADMIN'
    })
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_PRODUCTS_POST] ❌ Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_PRODUCTS_POST] Raw request body received:', Object.keys(body))
    console.log('[ADMIN_PRODUCTS_POST] Form data preview:', {
      name: body.name,
      price: body.price,
      categoryId: body.categoryId,
      imagesCount: body.images?.length || 0
    })
    
    // Validate the request body step by step
    console.log('[ADMIN_PRODUCTS_POST] Starting validation...')
    
    try {
      const validatedData = createProductSchema.parse(body)
      console.log('[ADMIN_PRODUCTS_POST] ✅ Validation successful')
      console.log('[ADMIN_PRODUCTS_POST] Validated data preview:', {
        name: validatedData.name,
        slug: validatedData.slug,
        price: validatedData.price,
        categoryId: validatedData.categoryId,
        imagesCount: validatedData.images?.length || 0
      })

      // Check if slug already exists
      console.log('[ADMIN_PRODUCTS_POST] Checking for existing slug:', validatedData.slug)
      const existingProduct = await prisma.product.findUnique({
        where: { slug: validatedData.slug }
      })

      if (existingProduct) {
        console.log('[ADMIN_PRODUCTS_POST] ❌ Slug already exists:', validatedData.slug)
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 400 }
        )
      }

      // Check if category exists
      console.log('[ADMIN_PRODUCTS_POST] Verifying category exists:', validatedData.categoryId)
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId }
      })

      if (!category) {
        console.log('[ADMIN_PRODUCTS_POST] ❌ Category not found:', validatedData.categoryId)
        return NextResponse.json(
          { error: 'Selected category does not exist' },
          { status: 400 }
        )
      }

      console.log('[ADMIN_PRODUCTS_POST] ✅ Category found:', category.name)

      // Extract images from the validated data
      const { images, ...productData } = validatedData
      console.log('[ADMIN_PRODUCTS_POST] Product data for creation:', {
        ...productData,
        specifications: Object.keys(productData.specifications || {}).length
      })
      console.log('[ADMIN_PRODUCTS_POST] Images to process:', images?.length || 0)

      // Create product with images in a transaction
      console.log('[ADMIN_PRODUCTS_POST] Starting database transaction...')
      const product = await prisma.$transaction(async (tx) => {
        // Create the product first
        console.log('[ADMIN_PRODUCTS_POST] Creating product record...')
        const newProduct = await tx.product.create({
          data: productData,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })
        console.log('[ADMIN_PRODUCTS_POST] ✅ Product created with ID:', newProduct.id)

        // Create product images if provided
        if (images && images.length > 0) {
          console.log('[ADMIN_PRODUCTS_POST] Creating product images...')
          const imageData = images.map(img => ({
            productId: newProduct.id,
            url: img.url,
            altText: img.altText || '',
            position: img.position
          }))
          console.log('[ADMIN_PRODUCTS_POST] Image data:', imageData)

          await tx.productImage.createMany({
            data: imageData
          })
          console.log('[ADMIN_PRODUCTS_POST] ✅ Created', images.length, 'product images')
        }

        // Fetch the complete product with images
        console.log('[ADMIN_PRODUCTS_POST] Fetching complete product data...')
        return await tx.product.findUnique({
          where: { id: newProduct.id },
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
      })

      if (!product) {
        throw new Error('Failed to create product')
      }

      // Convert Decimal fields to numbers
      const productWithNumbers = {
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      }

      console.log(`[ADMIN_PRODUCTS_POST] ✅ SUCCESS: Product "${product.name}" created successfully`)
      console.log('[ADMIN_PRODUCTS_POST] Final product data:', {
        id: product.id,
        name: product.name,
        slug: product.slug,
        categoryName: product.category.name,
        imagesCount: product.images.length,
        price: productWithNumbers.price
      })

      return NextResponse.json({ product: productWithNumbers }, { status: 201 })
      
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.log('[ADMIN_PRODUCTS_POST] ❌ Validation failed:', validationError.issues)
        return NextResponse.json(
          { 
            error: 'Validation error', 
            details: validationError.issues,
            message: 'Please check your input data'
          },
          { status: 400 }
        )
      }
      throw validationError
    }

  } catch (error) {
    console.error('[ADMIN_PRODUCTS_POST] ❌ UNEXPECTED ERROR:', error)
    console.error('[ADMIN_PRODUCTS_POST] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the product'
      },
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
        { error: 'Validation error', details: error.issues },
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