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
    console.log('[PRODUCT_IMAGE_GALLERY] Upload complete callback triggered')
    console.log('[PRODUCT_IMAGE_GALLERY] Upload results:', res)
    
    if (!res || res.length === 0) {
      console.log('[PRODUCT_IMAGE_GALLERY] No upload results received')
      return
    }

    const newImages = res.map((file, index) => {
      const newImage = {
        id: `temp-${Date.now()}-${index}`,
        url: file.url,
        altText: '',
        position: images.length + index
      }
      console.log('[PRODUCT_IMAGE_GALLERY] Creating new image object:', newImage)
      return newImage
    })

    console.log('[PRODUCT_IMAGE_GALLERY] New images to add:', newImages)

    // If we have a productId, save images to database
    if (productId) {
      console.log('[PRODUCT_IMAGE_GALLERY] Product ID exists, saving to database:', productId)
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

        console.log('[PRODUCT_IMAGE_GALLERY] Database save response status:', response.status)

        if (response.ok) {
          const { images: savedImages } = await response.json()
          console.log('[PRODUCT_IMAGE_GALLERY] Images saved to database:', savedImages)
          onImagesChange([...images, ...savedImages])
        } else {
          const errorData = await response.json()
          console.error('[PRODUCT_IMAGE_GALLERY] Failed to save images to database:', errorData)
          onImagesChange([...images, ...newImages])
        }
      } catch (error) {
        console.error('[PRODUCT_IMAGE_GALLERY] Error saving images to database:', error)
        onImagesChange([...images, ...newImages])
      }
    } else {
      console.log('[PRODUCT_IMAGE_GALLERY] No product ID, updating local state only')
      onImagesChange([...images, ...newImages])
    }
    
    setUploading(false)
  }

  const handleUploadError = (error: Error) => {
    console.error('[PRODUCT_IMAGE_GALLERY] Upload error:', error)
    console.error('[PRODUCT_IMAGE_GALLERY] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    alert(`Upload failed: ${error.message}`)
    setUploading(false)
  }

  const handleUploadBegin = () => {
    console.log('[PRODUCT_IMAGE_GALLERY] Upload began')
    setUploading(true)
  }

  const handleImageUpdate = async (imageId: string, altText: string) => {
    console.log('[PRODUCT_IMAGE_GALLERY] Updating image:', imageId, 'altText:', altText)
    
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, altText } : img
    )
    onImagesChange(updatedImages)

    // Update in database if productId exists
    if (productId && !imageId.startsWith('temp-')) {
      console.log('[PRODUCT_IMAGE_GALLERY] Updating image in database')
      try {
        const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ altText })
        })
        console.log('[PRODUCT_IMAGE_GALLERY] Image update response status:', response.status)
      } catch (error) {
        console.error('[PRODUCT_IMAGE_GALLERY] Error updating image:', error)
      }
    }

    setEditingImage(null)
  }

  const handleImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    console.log('[PRODUCT_IMAGE_GALLERY] Deleting image:', imageId)

    const updatedImages = images.filter(img => img.id !== imageId)
    onImagesChange(updatedImages)

    // Delete from database if productId exists
    if (productId && !imageId.startsWith('temp-')) {
      console.log('[PRODUCT_IMAGE_GALLERY] Deleting image from database')
      try {
        const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
          method: 'DELETE'
        })
        console.log('[PRODUCT_IMAGE_GALLERY] Image delete response status:', response.status)
      } catch (error) {
        console.error('[PRODUCT_IMAGE_GALLERY] Error deleting image:', error)
      }
    }
  }

  const handleDragStart = (index: number) => {
    console.log('[PRODUCT_IMAGE_GALLERY] Drag started for index:', index)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    console.log('[PRODUCT_IMAGE_GALLERY] Drop at index:', dropIndex, 'from:', draggedIndex)
    
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

    console.log('[PRODUCT_IMAGE_GALLERY] Reordered images:', updatedImages)
    onImagesChange(updatedImages)

    // Update positions in database if productId exists
    if (productId) {
      console.log('[PRODUCT_IMAGE_GALLERY] Updating image positions in database')
      try {
        const response = await fetch(`/api/admin/products/${productId}/images/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageOrders: updatedImages.map(img => ({
              id: img.id,
              position: img.position
            }))
          })
        })
        console.log('[PRODUCT_IMAGE_GALLERY] Reorder response status:', response.status)
      } catch (error) {
        console.error('[PRODUCT_IMAGE_GALLERY] Error reordering images:', error)
      }
    }

    setDraggedIndex(null)
  }

  console.log('[PRODUCT_IMAGE_GALLERY] Rendering with:', {
    productId,
    imagesCount: images.length,
    maxImages,
    uploading
  })

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
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Upload product images (max {maxImages - images.length} more)
              </p>
              
              <UploadDropzone<OurFileRouter, "productImage">
                endpoint="productImage"
                onClientUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                onUploadBegin={handleUploadBegin}
                className="ut-label:text-lg ut-allowed-content:ut-uploading:text-red-300"
                config={{ mode: "auto" }}
              />
              
              <div className="mt-4">
                <UploadButton<OurFileRouter, "productImage">
                  endpoint="productImage"
                  onClientUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadBegin={handleUploadBegin}
                />
              </div>
            </div>
            
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
            <li>• Supported formats: JPEG, PNG, WebP (max 4MB each)</li>
          </ul>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-50 p-3 rounded text-xs">
          <div className="font-medium mb-1">Debug Info:</div>
          <div>Images: {images.length}/{maxImages}</div>
          <div>Uploading: {uploading ? 'Yes' : 'No'}</div>
          <div>Product ID: {productId || 'Not set (new product)'}</div>
        </div>
      </CardContent>
    </Card>
  )
} 