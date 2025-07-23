import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const featured = searchParams.get('featured')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {
      isActive: true,
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
        { brand: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Category filter
    if (category) {
      where.category = {
        slug: category
      }
    }
    
    // Brand filter
    if (brand) {
      where.brand = {
        contains: brand,
        mode: 'insensitive'
      }
    }
    
    // Price filters
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }
    
    // Featured filter
    if (featured === 'true') {
      where.featured = true
    }
    
    // Build orderBy
    const orderBy: any = {}
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder
        break
      case 'name':
        orderBy.name = sortOrder
        break
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder
        break
    }
    
    // Fetch products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          images: {
            orderBy: { position: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              reviews: true,
            }
          }
        },
      }),
      prisma.product.count({ where }),
    ])
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
} 