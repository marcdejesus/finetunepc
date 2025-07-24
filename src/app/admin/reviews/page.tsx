'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/admin-layout'
import { ReviewImport } from '@/components/admin/review-import'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Star,
  Search, 
  Filter, 
  Eye,
  EyeOff,
  Edit,
  Trash2,
  MessageSquare,
  TrendingUp,
  Users,
  ThumbsUp,
  Upload
} from 'lucide-react'

interface Review {
  id: string
  rating: number
  title?: string
  comment?: string
  verified: boolean
  helpful: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
  product: {
    id: string
    name: string
    slug: string
  }
  user: {
    id: string
    name?: string
    email: string
  }
}

interface ReviewsResponse {
  reviews: Review[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  insights: {
    totalReviews: number
    averageRating: number
    hiddenReviews: number
    verifiedReviews: number
  }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [page, searchTerm, ratingFilter, statusFilter, verifiedFilter, sortBy, sortOrder])

  const fetchReviews = async () => {
    console.log('[ADMIN_REVIEWS_PAGE] Starting fetchReviews...')
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(ratingFilter !== 'all' && { rating: ratingFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(verifiedFilter !== 'all' && { verified: verifiedFilter })
      })

      console.log('[ADMIN_REVIEWS_PAGE] Fetching:', `/api/admin/reviews?${params}`)
      const response = await fetch(`/api/admin/reviews?${params}`)
      
      if (response.ok) {
        const data: ReviewsResponse = await response.json()
        console.log('[ADMIN_REVIEWS_PAGE] Received data:', data)
        
        setReviews(data.reviews)
        setPagination(data.pagination)
        setInsights(data.insights)
      } else {
        console.error('[ADMIN_REVIEWS_PAGE] Error fetching reviews:', response.status)
        alert('Error fetching reviews')
      }
    } catch (error) {
      console.error('[ADMIN_REVIEWS_PAGE] Network error:', error)
      alert('Error fetching reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async (reviewId: string, isVisible: boolean) => {
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !isVisible })
      })

      if (response.ok) {
        fetchReviews() // Refresh the list
      } else {
        alert('Error updating review visibility')
      }
    } catch (error) {
      console.error('Error updating review:', error)
      alert('Error updating review visibility')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchReviews() // Refresh the list
      } else {
        alert('Error deleting review')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Error deleting review')
    }
  }

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  const getStatusBadge = (review: Review) => {
    if (!review.isVisible) {
      return <Badge variant="secondary">Hidden</Badge>
    }
    if (review.verified) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
    }
    return <Badge variant="outline">Public</Badge>
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Management</h1>
            <p className="text-muted-foreground">
              Manage and moderate product reviews
            </p>
          </div>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Import Reviews
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Reviews</DialogTitle>
                <DialogDescription>
                  Import product reviews from JSON data
                </DialogDescription>
              </DialogHeader>
              <ReviewImport />
            </DialogContent>
          </Dialog>
        </div>

        {/* Insights Cards */}
        {insights && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights.totalReviews}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insights.averageRating.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ 5.0</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Reviews</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{insights.verifiedReviews}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hidden Reviews</CardTitle>
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{insights.hiddenReviews}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>

              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p>Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No reviews found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Review</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            {review.title && (
                              <p className="font-medium text-sm mb-1">{review.title}</p>
                            )}
                            {review.comment && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {review.comment}
                              </p>
                            )}
                            {review.helpful > 0 && (
                              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                <span>{review.helpful} helpful</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{review.product.name}</p>
                            <p className="text-xs text-muted-foreground">{review.product.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{review.user.name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{review.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {renderStars(review.rating)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(review)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleVisibility(review.id, review.isVisible)}
                            >
                              {review.isVisible ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing{' '}
                      {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalCount)} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                      {pagination.totalCount} reviews
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 