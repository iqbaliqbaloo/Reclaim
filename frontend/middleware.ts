/*
  ============================================================
  MIDDLEWARE — runs on every request before page loads

  PROTECTS routes that need login:
    /dashboard → redirect to /login if no token
    /admin     → redirect to / if not admin

  HOW IT WORKS:
  Reads refreshToken from cookies
  If missing → redirect to login

  NOTE: we cannot verify JWT in middleware (no secret access)
  We just check if cookie exists
  Actual JWT verification happens in auth-service
  If token is invalid → axios interceptor redirects to login

  STORED IN: root of project (not inside src/)
  ============================================================
*/

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/*
  Routes that require login
  Anyone without refreshToken cookie → redirect to /login
*/
const protectedRoutes = ['/dashboard', '/listings/create', '/chat']

/*
  Routes that require admin role
  We cannot check role in middleware (no JWT decode)
  Role check happens in the page component itself
*/
const adminRoutes = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[middleware] request path:', pathname)

  // check if route is protected
  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  const isAdmin = adminRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtected || isAdmin) {
    /*
      Check for refresh token cookie
      If missing → user is not logged in → redirect to login

      DATA READ FROM:
      Cookie: refreshToken (httpOnly, set by auth-service on login)
    */
    const refreshToken = request.cookies.get('refreshToken')
    console.log('[middleware] refreshToken present:', !!refreshToken)

    if (!refreshToken) {
      console.log('[middleware] no token — redirecting to /login')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/listings/create',
    '/chat/:path*',
    '/admin/:path*'
  ]
}