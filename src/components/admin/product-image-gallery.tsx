'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  Move, 
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { UploadButton, UploadDropzone } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

interface ProductImage {
  id: string
  url: string
  altText: string | null
  position: number
}

interface ProductImageGalleryProps {
  productId?: string
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
  maxImages?: number
}

export function ProductImageGallery({ 
  productId, 
  images, 
  onImagesChange, 
  maxImages = 10 
}: ProductImageGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleUploadComplete = async (res: any[]) => {
    if (!res || res.length === 0) return

    const newImages = res.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: file.url,
      altText: '',
      position: images.length + index
    }))

    // If we have a productId, save images to database
    if (productId) {
      try {
        const response = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: newImages.map(img => ({
              url: img.url,
              altText: img.altText,
              position: img.position
            }))
          })
        })

        if (response.ok) {
          const { images: savedImages } = await response.json()
          onImagesChange([...images, ...savedImages])
        } else {
          console.error('Failed to save images')
          onImagesChange([...images, ...newImages])
        }
      } catch (error) {
        console.error('Error saving images:', error)
        onImagesChange([...images, ...newImages])
      }
    } else {
      onImagesChange([...images, ...newImages])
    }
  }

  const handleImageUpdate = async (imageId: string, altText: string) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, altText } : img
    )
    onImagesChange(updatedImages)

    // Update in database if productId exists
    if (productId && !imageId.startsWith('temp-')) {
      try {
        await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ altText })
        })
      } catch (error) {
        console.error('Error updating image:', error)
      }
    }

    setEditingImage(null)
  }

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    const updatedImages = images.filter(img => img.id !== imageId)
    onImagesChange(updatedImages)

    // Delete from database if productId exists
    if (productId && !imageId.startsWith('temp-')) {
      try {
        await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error deleting image:', error)
      }
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const reorderedImages = [...images]
    const [draggedImage] = reorderedImages.splice(draggedIndex, 1)
    reorderedImages.splice(dropIndex, 0, draggedImage)

    // Update positions
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      position: index
    }))

    onImagesChange(updatedImages)

    // Update positions in database if productId exists
    if (productId) {
      try {
        await fetch(`/api/admin/products/${productId}/images/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageOrders: updatedImages.map(img => ({
              id: img.id,
              position: img.position
            }))
          })
        })
      } catch (error) {
        console.error('Error reordering images:', error)
      }
    }

    setDraggedIndex(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Product Images</span>
          <Badge variant="secondary">{images.length}/{maxImages}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        {images.length < maxImages && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <UploadDropzone<OurFileRouter, "productImage">
              endpoint="productImage"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(error: Error) => {
                console.error('Upload error:', error)
                alert(`Upload failed: ${error.message}`)
              }}
              onUploadBegin={() => setUploading(true)}
              onDrop={() => setUploading(false)}
              className="ut-label:text-lg ut-allowed-content:ut-uploading:text-red-300"
            />
            
            {uploading && (
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Uploading images...</span>
              </div>
            )}
          </div>
        )}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images
              .sort((a, b) => a.position - b.position)
              .map((image, index) => (
                <div
                  key={image.id}
                  className="relative group border rounded-lg overflow-hidden bg-gray-50"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Image */}
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={image.altText || `Product image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Primary Badge */}
                  {index === 0 && (
                    <Badge className="absolute top-2 left-2 bg-blue-600">
                      Primary
                    </Badge>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(image.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingImage(image)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleImageDelete(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Drag Handle */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white rounded p-1 cursor-move">
                      <Move className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Position Indicator */}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No images uploaded</p>
            <p className="text-sm">Upload images to showcase your product</p>
          </div>
        )}

        {/* Edit Modal */}
        {editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit Image Details</h3>
              
              <div className="space-y-4">
                <div className="aspect-square w-32 mx-auto">
                  <img
                    src={editingImage.url}
                    alt={editingImage.altText || 'Product image'}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                
                <div>
                  <Label htmlFor="altText">Alt Text (for accessibility)</Label>
                  <Input
                    id="altText"
                    defaultValue={editingImage.altText || ''}
                    placeholder="Describe this image..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        handleImageUpdate(editingImage.id, input.value)
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setEditingImage(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const input = document.getElementById('altText') as HTMLInputElement
                    handleImageUpdate(editingImage.id, input.value)
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Tips */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Image Guidelines</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload high-quality images (minimum 800x800px recommended)</li>
            <li>• First image will be used as the primary product image</li>
            <li>• Drag and drop to reorder images</li>
            <li>• Add alt text for better accessibility and SEO</li>
            <li>• Maximum {maxImages} images per product</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 