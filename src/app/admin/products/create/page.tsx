'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/admin-layout'
import { ProductImageGallery } from '@/components/admin/product-image-gallery'
import { ReviewImport } from '@/components/admin/review-import'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Upload } from 'lucide-react'

interface ProductImage {
  id: string
  url: string
  altText: string | null
  position: number
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function CreateProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: 0,
    comparePrice: 0,
    costPrice: 0,
    stock: 0,
    sku: '',
    weight: 0,
    categoryId: '',
    brand: '',
    warranty: '',
    featured: false,
    isActive: true,
    metaTitle: '',
    metaDescription: '',
    specifications: {} as Record<string, any>
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && { slug: generateSlug(value) })
    }))
  }

  const handleSpecificationChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  const addSpecificationField = () => {
    const key = prompt('Enter specification name:')
    if (key && key.trim()) {
      handleSpecificationChange(key.trim(), '')
    }
  }

  const removeSpecificationField = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specifications }
      delete newSpecs[key]
      return {
        ...prev,
        specifications: newSpecs
      }
    })
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Product name is required')
      return false
    }
    if (!formData.description.trim()) {
      alert('Product description is required')
      return false
    }
    if (formData.price <= 0) {
      alert('Product price must be greater than 0')
      return false
    }
    if (!formData.categoryId) {
      alert('Please select a category')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      console.log('[CREATE_PRODUCT] Saving product with data:', formData)
      console.log('[CREATE_PRODUCT] Images to associate:', images)

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: images.map(img => ({
            url: img.url,
            altText: img.altText || '',
            position: img.position
          }))
        })
      })

      if (response.ok) {
        const { product } = await response.json()
        console.log('[CREATE_PRODUCT] Product created successfully:', product.id)
        router.push(`/admin/products/${product.id}`)
      } else {
        const error = await response.json()
        console.error('[CREATE_PRODUCT] Error creating product:', error)
        alert(`Error creating product: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[CREATE_PRODUCT] Network error:', error)
      alert('Error creating product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create New Product</h1>
              <p className="text-muted-foreground">
                Add a new product to your inventory
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="product-slug"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed product description"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    placeholder="Brief product summary for listings"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="comparePrice">Compare Price ($)</Label>
                    <Input
                      id="comparePrice"
                      type="number"
                      step="0.01"
                      value={formData.comparePrice}
                      onChange={(e) => handleInputChange('comparePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="costPrice">Cost Price ($)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Product SKU"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      placeholder="Product brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="warranty">Warranty</Label>
                    <Input
                      id="warranty"
                      value={formData.warranty}
                      onChange={(e) => handleInputChange('warranty', e.target.value)}
                      placeholder="e.g., 1 year"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Specifications</CardTitle>
                  <Button variant="outline" size="sm" onClick={addSpecificationField}>
                    Add Specification
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(formData.specifications).length === 0 ? (
                  <p className="text-muted-foreground">No specifications added yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(formData.specifications).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value
                            const newSpecs = { ...formData.specifications }
                            delete newSpecs[key]
                            newSpecs[newKey] = value
                            handleInputChange('specifications', newSpecs)
                          }}
                          placeholder="Specification name"
                          className="w-1/3"
                        />
                        <Input
                          value={value as string}
                          onChange={(e) => handleSpecificationChange(key, e.target.value)}
                          placeholder="Specification value"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSpecificationField(key)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                    placeholder="SEO title for search engines"
                  />
                </div>
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    placeholder="SEO description for search engines"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleInputChange('categoryId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => handleInputChange('featured', checked)}
                    />
                    <Label htmlFor="featured">Featured Product</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive">Active (Visible to customers)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Images */}
            <ProductImageGallery
              images={images}
              onImagesChange={setImages}
              maxImages={10}
            />

            {/* Review Import */}
            <ReviewImport />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 