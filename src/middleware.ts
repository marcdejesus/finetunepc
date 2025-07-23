import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Routes that require authentication
const protectedRoutes = [
  "/admin",
  "/profile",
  "/orders", 
  "/services",
  "/checkout"
]

// Routes that require admin role
const adminRoutes = [
  "/admin"
]

// Routes that should redirect to home if already authenticated
const authRoutes = [
  "/auth/signin",
  "/auth/signup"
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the session
  const session = await auth()
  
  // Check if user is accessing auth routes while authenticated
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }
  
  // Check if user is accessing protected routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    if (!session) {
      // Redirect to sign-in with callback URL
      const signInUrl = new URL("/auth/signin", request.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }
    
    // Check admin routes
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    if (isAdminRoute && session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
} 