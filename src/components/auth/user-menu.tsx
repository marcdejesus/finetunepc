"use client"

import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Settings, 
  ShoppingBag, 
  Wrench, 
  LogOut, 
  Shield,
  ChevronDown 
} from "lucide-react"

export default function UserMenu() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-2">
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">Sign Up</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center space-x-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden md:block">{session.user.name || session.user.email}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name || "User"}
                </p>
                <p className="text-sm text-gray-500">{session.user.email}</p>
                {session.user.role && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    <Shield className="w-3 h-3 mr-1" />
                    {session.user.role}
                  </span>
                )}
              </div>
              
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                <User className="mr-3 h-4 w-4" />
                Profile
              </Link>
              
              <Link
                href="/orders"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="mr-3 h-4 w-4" />
                Orders
              </Link>
              
              <Link
                href="/services"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                <Wrench className="mr-3 h-4 w-4" />
                Services
              </Link>
              
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="mr-3 h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
              
              <div className="border-t">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    signOut({ callbackUrl: "/" })
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 