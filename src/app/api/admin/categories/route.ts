import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true)
})

// GET - Fetch categories for admin
export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN_CATEGORIES_GET] Starting categories fetch...')
    
    const session = await auth()
    console.log(`[ADMIN_CATEGORIES_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_CATEGORIES_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeChildren = searchParams.get('includeChildren') === 'true'
    
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: includeChildren ? undefined : null, // Only root categories by default
      },
      include: {
        children: includeChildren ? {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                products: {
                  where: { isActive: true }
                }
              }
            }
          }
        } : false,
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    })

    console.log(`[ADMIN_CATEGORIES_GET] Successfully fetched ${categories.length} categories`)
    
    return NextResponse.json({
      categories,
      total: categories.length
    })
  } catch (error) {
    console.error('[ADMIN_CATEGORIES_GET] Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN_CATEGORIES_POST] Creating new category...')
    
    const session = await auth()
    console.log(`[ADMIN_CATEGORIES_POST] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_CATEGORIES_POST] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[ADMIN_CATEGORIES_POST] Request body:', JSON.stringify(body, null, 2))
    
    const validatedData = createCategorySchema.parse(body)
    console.log('[ADMIN_CATEGORIES_POST] Validated data:', JSON.stringify(validatedData, null, 2))

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existingCategory) {
      console.log('[ADMIN_CATEGORIES_POST] Slug already exists:', validatedData.slug)
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      )
    }

    // Create the category
    const category = await prisma.category.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    console.log(`[ADMIN_CATEGORIES_POST] Successfully created category: ${category.name} (${category.id})`)

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ADMIN_CATEGORIES_POST] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[ADMIN_CATEGORIES_POST] Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 