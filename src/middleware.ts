import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Routes that require authentication
const protectedRoutes = [
  "/admin",
  "/profile",
  "/orders", 
  "/services",
  "/checkout",
  "/technician"
]

// Routes that require admin role
const adminRoutes = [
  "/admin"
]

const technicianRoutes = [
  "/technician"
]

// Routes that should redirect to home if already authenticated
const authRoutes = [
  "/auth/signin",
  "/auth/signup"
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log(`🔍 MIDDLEWARE: Processing request to ${pathname}`)
  
  // Get the session
  const session = await auth()
  
  console.log(`🔍 MIDDLEWARE: Session exists: ${!!session}, User: ${session?.user?.id}, Role: ${session?.user?.role}`)
  
  // Check if user is accessing auth routes while authenticated
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (session) {
      console.log(`🔄 MIDDLEWARE: Redirecting authenticated user from auth route ${pathname} to home`)
      return NextResponse.redirect(new URL("/", request.url))
    }
    console.log(`✅ MIDDLEWARE: Allowing access to auth route ${pathname}`)
    return NextResponse.next()
  }
  
  // Check if user is accessing protected routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  console.log(`🔍 MIDDLEWARE: Is protected route: ${isProtectedRoute}`)
  
  if (isProtectedRoute) {
    if (!session) {
      console.log(`🚫 MIDDLEWARE: No session, redirecting to sign-in`)
      // Redirect to sign-in with callback URL
      const signInUrl = new URL("/auth/signin", request.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }
    
    // Check admin routes
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    console.log(`🔍 MIDDLEWARE: Is admin route: ${isAdminRoute}`)
    
    if (isAdminRoute) {
      console.log(`🔍 MIDDLEWARE: Admin route detected, checking role: ${session.user.role}`)
      
      if (!["ADMIN", "MANAGER", "TECHNICIAN"].includes(session.user.role)) {
        console.log(`🚫 MIDDLEWARE: Access denied for ${session.user.role} trying to access ${pathname}`)
        return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url))
      }
      
      // Special handling for technicians accessing admin routes
      if (session.user.role === "TECHNICIAN") {
        console.log(`🔍 MIDDLEWARE: Technician accessing admin route, checking if service route`)
        // Only allow technicians to access service-related admin routes
        const isServiceRoute = pathname.startsWith("/admin/services")
        console.log(`🔍 MIDDLEWARE: Is service route: ${isServiceRoute}`)
        
        if (!isServiceRoute) {
          console.log(`🚫 MIDDLEWARE: Technician ${session.user.id} denied access to non-service admin route: ${pathname}`)
          return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url))
        }
        // Service assignment verification will be handled in the API routes
        console.log(`✅ MIDDLEWARE: Allowing technician ${session.user.id} access to service route: ${pathname}`)
      } else {
        console.log(`✅ MIDDLEWARE: Allowing ${session.user.role} access to admin route: ${pathname}`)
      }
    }
    
    // Check technician routes
    const isTechnicianRoute = technicianRoutes.some(route => pathname.startsWith(route))
    console.log(`🔍 MIDDLEWARE: Is technician route: ${isTechnicianRoute}`)
    
    if (isTechnicianRoute && !["TECHNICIAN", "MANAGER"].includes(session.user.role)) {
      console.log(`🚫 MIDDLEWARE: Access denied for ${session.user.role} trying to access technician route: ${pathname}`)
      return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url))
    }
  }
  
  console.log(`✅ MIDDLEWARE: Allowing request to ${pathname}`)
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