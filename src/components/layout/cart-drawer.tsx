'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCartStore } from '@/store/cart-store'
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react'

export function CartDrawer() {
  const {
    items,
    isOpen,
    totalItems,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  } = useCartStore()
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId)
    } else {
      updateQuantity(productId, newQuantity)
    }
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => open ? openCart() : closeCart()}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="w-4 h-4" />
          {mounted && totalItems > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Shopping Cart ({totalItems} items)
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">Add some products to get started</p>
              <Button asChild onClick={closeCart}>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {items.map((item) => (
                  <Card key={item.productId} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link 
                                href={`/products/${item.slug}`}
                                onClick={closeCart}
                                className="text-sm font-medium hover:text-primary transition-colors line-clamp-2"
                              >
                                {item.name}
                              </Link>
                                                             <p className="text-sm font-semibold mt-1">
                                 ${Number(item.price).toFixed(2)}
                               </p>
                            </div>
                            
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.productId)}
                              className="text-muted-foreground hover:text-destructive p-1 h-auto"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value)
                                  if (!isNaN(newQuantity) && newQuantity > 0) {
                                    handleQuantityChange(item.productId, newQuantity)
                                  }
                                }}
                                className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                                max={item.stock}
                              />
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                                                         {/* Item Total */}
                             <div className="text-sm font-semibold">
                               ${(Number(item.price) * item.quantity).toFixed(2)}
                             </div>
                          </div>
                          
                          {/* Stock Warning */}
                          {item.quantity >= item.stock && (
                            <p className="text-xs text-amber-600 mt-1">
                              Max stock: {item.stock}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Separator className="my-6" />
              
              {/* Cart Summary */}
              <div className="space-y-4">
                                 <div className="flex items-center justify-between text-lg font-semibold">
                   <span>Total:</span>
                   <span>${Number(totalPrice).toFixed(2)}</span>
                 </div>
                
                {/* Checkout Actions */}
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/checkout" onClick={closeCart}>
                      Proceed to Checkout
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/products" onClick={closeCart}>
                      Continue Shopping
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 