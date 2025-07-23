'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUploadThing } from '@/lib/uploadthing'
import { X, Upload, Move, Eye, Trash2, Plus, Loader2 } from 'lucide-react'

interface ProductImage {
  id: string
  url: string
  altText?: string
  position: number
}

interface ProductImageGalleryProps {
  productId?: string
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
  maxImages?: number
  editable?: boolean
}

export function ProductImageGallery({
  productId,
  images = [],
  onImagesChange,
  maxImages = 10,
  editable = true
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number>(0)
  const [uploading, setUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const { startUpload, isUploading } = useUploadThing("productImage", {
    onClientUploadComplete: (res) => {
      if (res) {
        const newImages = res.map((file, index) => ({
          id: `temp-${Date.now()}-${index}`,
          url: file.url,
          altText: '',
          position: images.length + index
        }))
        
        onImagesChange([...images, ...newImages])
        setUploading(false)
      }
    },
    onUploadError: (error: Error) => {
      console.error('Upload error:', error)
      setUploading(false)
      alert('Upload failed: ' + error.message)
    },
  })
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }
    
    setUploading(true)
    await startUpload(files)
  }
  
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, position: i }))
    onImagesChange(newImages)
    
    if (selectedImage >= newImages.length) {
      setSelectedImage(Math.max(0, newImages.length - 1))
    }
  }
  
  const updateImageAlt = (index: number, altText: string) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], altText }
    onImagesChange(newImages)
  }
  
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    
    // Update positions
    const reorderedImages = newImages.map((img, i) => ({ ...img, position: i }))
    onImagesChange(reorderedImages)
    
    setSelectedImage(toIndex)
  }
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null) {
      moveImage(draggedIndex, toIndex)
      setDraggedIndex(null)
    }
  }
  
  if (!editable && images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images available
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      {images.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
              <Image
                src={images[selectedImage]?.url}
                alt={images[selectedImage]?.altText || `Product image ${selectedImage + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              
              {/* Image Counter */}
              <div className="absolute top-4 right-4">
                <Badge variant="secondary">
                  {selectedImage + 1} of {images.length}
                </Badge>
              </div>
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2"
                    onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1)}
                  >
                    ←
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    onClick={() => setSelectedImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0)}
                  >
                    →
                  </Button>
                </>
              )}
            </div>
            
            {/* Alt Text Editor */}
            {editable && images[selectedImage] && (
              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text (for accessibility)</Label>
                <Input
                  id="alt-text"
                  value={images[selectedImage]?.altText || ''}
                  onChange={(e) => updateImageAlt(selectedImage, e.target.value)}
                  placeholder="Describe this image..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Thumbnail Gallery */}
      <div className="grid grid-cols-6 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`relative aspect-square bg-gray-100 rounded-md overflow-hidden cursor-pointer border-2 transition-colors ${
              selectedImage === index ? 'border-primary' : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setSelectedImage(index)}
            draggable={editable}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <Image
              src={image.url}
              alt={image.altText || `Thumbnail ${index + 1}`}
              fill
              className="object-cover"
              sizes="100px"
            />
            
            {/* Image Actions */}
            {editable && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImage(index)
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Position Indicator */}
            <div className="absolute top-1 left-1">
              <Badge variant="secondary" className="text-xs h-5">
                {index + 1}
              </Badge>
            </div>
          </div>
        ))}
        
        {/* Upload Button */}
        {editable && images.length < maxImages && (
          <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading || isUploading}
            />
            {uploading || isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Image</span>
              </>
            )}
          </label>
        )}
      </div>
      
      {/* Upload Status */}
      {(uploading || isUploading) && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Uploading images...</p>
        </div>
      )}
      
      {/* Gallery Info */}
      <div className="text-sm text-muted-foreground text-center">
        {images.length} of {maxImages} images • Drag to reorder • Click to select
      </div>
    </div>
  )
} 