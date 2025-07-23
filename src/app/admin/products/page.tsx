'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProductImageGallery } from '@/components/admin/product-image-gallery'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Image, Upload } from 'lucide-react'

// Demo product data
const demoProduct = {
  id: 'demo-product-1',
  name: 'NVIDIA GeForce RTX 4090',
  images: [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800',
      altText: 'NVIDIA GeForce RTX 4090 front view',
      position: 0
    },
    {
      id: '2', 
      url: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800',
      altText: 'NVIDIA GeForce RTX 4090 side view',
      position: 1
    }
  ]
}

export default function AdminProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState(demoProduct)
  const [images, setImages] = useState(selectedProduct.images)
  
  const handleImagesChange = (newImages: any[]) => {
    setImages(newImages)
    console.log('Images updated:', newImages)
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Product Management</h1>
        <p className="text-muted-foreground">
          Manage product information and images
        </p>
      </div>
      
      {/* Demo Notice */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Uploadthing Integration Active</p>
              <p className="text-sm text-blue-700">
                Product image upload and management is now available for admin users.
                You can upload, reorder, and manage product images with drag-and-drop functionality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Products
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div 
                  className="p-3 border rounded-lg cursor-pointer bg-primary/5 border-primary"
                  onClick={() => setSelectedProduct(demoProduct)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{demoProduct.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {demoProduct.images.length} images
                      </p>
                    </div>
                    <Badge variant="secondary">Demo</Badge>
                  </div>
                </div>
                
                <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
                  <p className="text-sm">More products will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Product Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Image className="w-5 h-5" />
                  <span>Product Images</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{selectedProduct.name}</h3>
                <p className="text-muted-foreground">
                  Manage product images using the gallery below. You can upload new images,
                  reorder them by dragging, and edit alt text for accessibility.
                </p>
              </div>
              
              {/* Image Gallery Component */}
              <ProductImageGallery
                productId={selectedProduct.id}
                images={images}
                onImagesChange={handleImagesChange}
                maxImages={10}
                editable={true}
              />
              
              {/* Save Changes */}
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="outline">
                  Cancel Changes
                </Button>
                <Button>
                  Save Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Feature Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>✅ Uploadthing Features Implemented</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">Multi-file Upload</p>
              <p className="text-sm text-muted-foreground">Upload up to 10 images at once</p>
            </div>
            <div className="text-center">
              <Image className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Image Management</p>
              <p className="text-sm text-muted-foreground">View, edit, and organize images</p>
            </div>
            <div className="text-center">
              <Edit className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">Drag & Drop Reorder</p>
              <p className="text-sm text-muted-foreground">Intuitive image organization</p>
            </div>
            <div className="text-center">
              <Trash2 className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="font-medium">Secure Admin Access</p>
              <p className="text-sm text-muted-foreground">Admin-only upload permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 