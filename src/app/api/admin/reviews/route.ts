import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN_REVIEWS_GET] Starting reviews fetch...')
    
    const session = await auth()
    console.log(`[ADMIN_REVIEWS_GET] Session user: ${session?.user?.id}, role: ${session?.user?.role}`)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      console.log('[ADMIN_REVIEWS_GET] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const rating = searchParams.get('rating')
    const status = searchParams.get('status') // 'visible', 'hidden'
    const verified = searchParams.get('verified') // 'verified', 'unverified'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (rating && rating !== 'all') {
      where.rating = parseInt(rating)
    }

    if (status && status !== 'all') {
      where.isVisible = status === 'visible'
    }

    if (verified && verified !== 'all') {
      where.verified = verified === 'verified'
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Fetch reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
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
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    // Calculate insights
    const [totalReviews, averageRatingResult, hiddenReviews, verifiedReviews] = await Promise.all([
      prisma.review.count(),
      prisma.review.aggregate({
        _avg: { rating: true }
      }),
      prisma.review.count({ where: { isVisible: false } }),
      prisma.review.count({ where: { verified: true } })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    console.log(`[ADMIN_REVIEWS_GET] Successfully fetched ${reviews.length} reviews for page ${page}`)
    console.log(`[ADMIN_REVIEWS_GET] Total reviews: ${totalCount}, Hidden: ${hiddenReviews}, Verified: ${verifiedReviews}`)

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      insights: {
        totalReviews,
        averageRating: averageRatingResult._avg.rating || 0,
        hiddenReviews,
        verifiedReviews
      }
    })
  } catch (error) {
    console.error('[ADMIN_REVIEWS_GET] Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 