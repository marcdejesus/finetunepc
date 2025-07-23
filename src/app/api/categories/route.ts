import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
} 