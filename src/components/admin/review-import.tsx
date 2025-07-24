'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  User,
  Calendar,
  Download,
  Trash2
} from 'lucide-react'

interface ReviewData {
  productId?: string
  productSku?: string
  productSlug?: string
  userEmail: string
  userName?: string
  rating: number
  title?: string
  comment?: string
  verified?: boolean
  helpful?: number
  isVisible?: boolean
  createdAt?: string
}

interface ParsedReview extends ReviewData {
  id: string
  status: 'valid' | 'invalid' | 'warning'
  errors: string[]
  warnings: string[]
}

interface ReviewImportProps {
  productId?: string
}

export function ReviewImport({ productId }: ReviewImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [parsedReviews, setParsedReviews] = useState<ParsedReview[]>([])
  const [importing, setImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  const validateReview = (review: any, index: number): ParsedReview => {
    const errors: string[] = []
    const warnings: string[] = []
    let status: 'valid' | 'invalid' | 'warning' = 'valid'

    // Required fields validation
    if (!review.userEmail || typeof review.userEmail !== 'string') {
      errors.push('User email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(review.userEmail)) {
      errors.push('Invalid email format')
    }

    if (!review.rating || typeof review.rating !== 'number') {
      errors.push('Rating is required')
    } else if (review.rating < 1 || review.rating > 5) {
      errors.push('Rating must be between 1 and 5')
    }

    // Product identification validation
    if (!productId) {
      if (!review.productId && !review.productSku && !review.productSlug) {
        errors.push('Product identification required (productId, productSku, or productSlug)')
      }
    }

    // Optional field validation
    if (review.userName && typeof review.userName !== 'string') {
      warnings.push('User name should be a string')
    }

    if (review.title && typeof review.title !== 'string') {
      warnings.push('Title should be a string')
    }

    if (review.comment && typeof review.comment !== 'string') {
      warnings.push('Comment should be a string')
    }

    if (review.createdAt && !Date.parse(review.createdAt)) {
      warnings.push('Invalid date format for createdAt')
    }

    // Set status
    if (errors.length > 0) {
      status = 'invalid'
    } else if (warnings.length > 0) {
      status = 'warning'
    }

    return {
      id: `review-${index}`,
      productId: productId || review.productId,
      productSku: review.productSku,
      productSlug: review.productSlug,
      userEmail: review.userEmail,
      userName: review.userName,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verified: review.verified || false,
      helpful: review.helpful || 0,
      isVisible: review.isVisible !== false,
      createdAt: review.createdAt,
      status,
      errors,
      warnings
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonText(content)
        parseReviews(content)
      }
      reader.readAsText(selectedFile)
    }
  }

  const parseReviews = (text: string) => {
    try {
      const data = JSON.parse(text)
      const reviewsArray = Array.isArray(data) ? data : [data]
      const parsed = reviewsArray.map((review, index) => validateReview(review, index))
      setParsedReviews(parsed)
      setImportComplete(false)
      setImportResults(null)
    } catch (error) {
      console.error('JSON parsing error:', error)
      setParsedReviews([])
      alert('Invalid JSON format. Please check your file.')
    }
  }

  const handleJsonTextChange = (text: string) => {
    setJsonText(text)
    if (text.trim()) {
      parseReviews(text)
    } else {
      setParsedReviews([])
    }
  }

  const getStatusStats = () => {
    const stats = parsedReviews.reduce(
      (acc, review) => {
        acc[review.status]++
        return acc
      },
      { valid: 0, warning: 0, invalid: 0 }
    )
    return stats
  }

  const handleImport = async () => {
    if (parsedReviews.length === 0) {
      alert('No reviews to import')
      return
    }

    const validReviews = parsedReviews.filter(review => 
      review.status === 'valid' || review.status === 'warning'
    )

    if (validReviews.length === 0) {
      alert('No valid reviews to import')
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/admin/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: validReviews.map(({ id, status, errors, warnings, ...review }) => review)
        })
      })

      if (response.ok) {
        const results = await response.json()
        setImportResults(results)
        setImportComplete(true)
        
        // Clear the form
        setFile(null)
        setJsonText('')
        setParsedReviews([])
        
        alert(`Successfully imported ${results.successful} reviews`)
      } else {
        const error = await response.json()
        alert(`Import failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        productId: "Use actual product ID from database",
        productSku: "Alternative: use SKU like 'AMD-7950X'",
        productSlug: "Alternative: use slug like 'amd-ryzen-9-7950x'",
        userEmail: "customer@example.com",
        userName: "John Doe",
        rating: 5,
        title: "Great product!",
        comment: "I love this product. Highly recommended.",
        verified: true,
        helpful: 2,
        isVisible: true,
        createdAt: "2024-01-15T10:30:00Z"
      },
      {
        productSlug: "amd-ryzen-9-7950x",
        userEmail: "gamer123@example.com",
        userName: "Gaming Enthusiast",
        rating: 5,
        title: "Incredible Performance!",
        comment: "This processor is absolutely amazing for gaming and content creation.",
        verified: true,
        helpful: 15,
        isVisible: true,
        createdAt: "2024-01-10T14:30:00Z"
      },
      {
        productSlug: "nvidia-rtx-4090",
        userEmail: "techreview@example.com",
        userName: "Tech Reviewer",
        rating: 5,
        title: "Beast of a GPU",
        comment: "Handles 4K gaming with ray tracing like a champ. Expensive but worth it.",
        verified: true,
        helpful: 23,
        isVisible: true,
        createdAt: "2024-01-08T09:15:00Z"
      },
      {
        productSlug: "corsair-vengeance-ddr5-32gb",
        userEmail: "builder@example.com", 
        userName: "PC Builder",
        rating: 4,
        title: "Great Memory Kit",
        comment: "Fast and reliable DDR5 memory. Works perfectly with my AMD build.",
        verified: true,
        helpful: 8,
        isVisible: true,
        createdAt: "2024-01-05T16:45:00Z"
      },
      {
        productSlug: "gaming-monitor-27-inch",
        userEmail: "visual@example.com",
        userName: "Visual Designer", 
        rating: 5,
        title: "Amazing Display Quality",
        comment: "Perfect for both gaming and professional work. Colors are vibrant and motion is smooth.",
        verified: true,
        helpful: 12,
        isVisible: true,
        createdAt: "2024-01-03T11:20:00Z"
      }
    ]

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'review-import-template.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearData = () => {
    setFile(null)
    setJsonText('')
    setParsedReviews([])
    setImportComplete(false)
    setImportResults(null)
  }

  const stats = getStatusStats()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Reviews</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            {(parsedReviews.length > 0 || importComplete) && (
              <Button variant="outline" size="sm" onClick={clearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import Results */}
        {importComplete && importResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-green-800">Import Completed</h3>
            </div>
            <div className="text-sm text-green-700">
              <p>Successfully imported: {importResults.successful} reviews</p>
              {importResults.failed > 0 && (
                <p>Failed: {importResults.failed} reviews</p>
              )}
              {importResults.duplicates > 0 && (
                <p>Skipped duplicates: {importResults.duplicates} reviews</p>
              )}
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload JSON File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          <div className="text-center text-muted-foreground">
            <p>or</p>
          </div>

          <div>
            <Label htmlFor="json-text">Paste JSON Data</Label>
            <Textarea
              id="json-text"
              value={jsonText}
              onChange={(e) => handleJsonTextChange(e.target.value)}
              placeholder="Paste your JSON review data here..."
              rows={8}
              className="mt-1 font-mono text-sm"
            />
          </div>
        </div>

        {/* Validation Results */}
        {parsedReviews.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Validation Results</h3>
              <div className="flex space-x-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Valid: {stats.valid}
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Warnings: {stats.warning}
                </Badge>
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  Invalid: {stats.invalid}
                </Badge>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <div className="space-y-2 p-4">
                {parsedReviews.map((review) => (
                  <div
                    key={review.id}
                    className={`border rounded-lg p-3 ${
                      review.status === 'valid'
                        ? 'border-green-200 bg-green-50'
                        : review.status === 'warning'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {review.status === 'valid' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : review.status === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{review.userEmail}</span>
                        </div>
                        
                        {review.title && (
                          <p className="text-sm font-medium mb-1">{review.title}</p>
                        )}
                        
                        {review.comment && (
                          <p className="text-sm text-gray-600 mb-2">{review.comment}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {review.userName && (
                            <span className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{review.userName}</span>
                            </span>
                          )}
                          {review.createdAt && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Errors and Warnings */}
                    {(review.errors.length > 0 || review.warnings.length > 0) && (
                      <div className="mt-3 space-y-1">
                        {review.errors.map((error, i) => (
                          <p key={i} className="text-xs text-red-600 flex items-center space-x-1">
                            <XCircle className="h-3 w-3" />
                            <span>{error}</span>
                          </p>
                        ))}
                        {review.warnings.map((warning, i) => (
                          <p key={i} className="text-xs text-yellow-600 flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{warning}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={importing || stats.valid + stats.warning === 0}
              >
                {importing ? 'Importing...' : `Import ${stats.valid + stats.warning} Reviews`}
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">JSON Format Guidelines</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Required:</strong> userEmail (valid email), rating (1-5)</li>
            <li>• <strong>Product ID:</strong> Provide productId, productSku, or productSlug</li>
            <li>• <strong>Optional:</strong> userName, title, comment, verified, helpful, isVisible</li>
            <li>• <strong>Date format:</strong> ISO 8601 (e.g., "2024-01-15T10:30:00Z")</li>
            <li>• <strong>Array or single object:</strong> Both formats are supported</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 