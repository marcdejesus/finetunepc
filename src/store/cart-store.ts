import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  image?: string
  slug: string
  quantity: number
  stock: number
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  totalItems: number
  totalPrice: number
  
  // Actions
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Internal
  _updateTotals: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      totalItems: 0,
      totalPrice: 0,
      
      _updateTotals: () => {
        const items = get().items
        const totalItems = items.reduce((total, item) => total + item.quantity, 0)
        const totalPrice = items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0)
        set({ totalItems, totalPrice })
      },
      
      addItem: (product) => {
        const state = get()
        const existingItem = state.items.find(item => item.productId === product.productId)
        
        if (existingItem) {
          // Check stock before increasing quantity
          if (existingItem.quantity >= product.stock) {
            console.warn('Cannot add more items - insufficient stock')
            return
          }
          
          const newItems = state.items.map(item =>
            item.productId === product.productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
          
          set({ items: newItems })
          get()._updateTotals()
          console.log('Item quantity updated')
        } else {
          const newItems = [...state.items, { ...product, quantity: 1 }]
          set({ items: newItems })
          get()._updateTotals()
          console.log('Item added to cart')
        }
      },
      
      removeItem: (productId) => {
        const newItems = get().items.filter(item => item.productId !== productId)
        set({ items: newItems })
        get()._updateTotals()
        console.log('Item removed from cart')
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        
        const state = get()
        const item = state.items.find(item => item.productId === productId)
        
        if (item && quantity > item.stock) {
          console.warn('Cannot add more items - insufficient stock')
          return
        }
        
        const newItems = state.items.map(item =>
          item.productId === productId
            ? { ...item, quantity }
            : item
        )
        
        set({ items: newItems })
        get()._updateTotals()
      },
      
      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 })
        console.log('Cart cleared')
      },
      
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._updateTotals()
        }
      },
    }
  )
) 