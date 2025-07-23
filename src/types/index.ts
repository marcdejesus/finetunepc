// User types
export interface User {
  id: string
  email: string
  name?: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
  updatedAt: Date
}

// Product types
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: string
  featured: boolean
  createdAt: Date
  updatedAt: Date
}

// Category types
export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
}

// Service types
export interface Service {
  id: string
  type: 'REPAIR' | 'UPGRADE' | 'CONSULTATION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  description: string
  scheduledDate: Date
  userId: string
  price?: number
  createdAt: Date
  updatedAt: Date
} 