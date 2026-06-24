'use client'

import { useState }  from 'react'
import Link          from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth }   from '@/store/authStore'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    setMobileOpen(false)
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        <Link
          href="/"
          onClick={closeMobile}
          className="text-xl font-bold gradient-text tracking-tight"
        >
          Reclaim
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-5">
          <Link href="/listings" className="text-sm text-mid hover:text-accent transition-colors duration-200">
            Browse
          </Link>

          {isAuthenticated && (
            <>
              <Link href="/listings/create" className="text-sm text-mid hover:text-accent transition-colors duration-200">
                Post Item
              </Link>
              <Link href="/dashboard" className="text-sm text-mid hover:text-accent transition-colors duration-200">
                Dashboard
              </Link>
              <Link href="/chat" className="text-sm text-mid hover:text-accent transition-colors duration-200">
                Chats
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-sm text-danger font-medium hover:opacity-80 transition-opacity">
                  Admin
                </Link>
              )}
              <NotificationBell />
              <div className="flex items-center gap-3 pl-2 border-l divider">
                <span className="text-xs text-lo truncate max-w-[120px]">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-mid hover:text-danger transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-mid hover:text-accent transition-colors duration-200">
                Login
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm px-4 py-1.5 rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-mid hover:text-hi transition-colors rounded-lg"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t divider animate-fade-in">
          <div
            className="px-4 py-2 flex flex-col"
            style={{ background: 'rgba(4,13,26,0.95)', backdropFilter: 'blur(24px)' }}
          >
            <Link
              href="/listings"
              className="text-sm text-mid py-3 border-b divider hover:text-accent transition-colors"
              onClick={closeMobile}
            >
              Browse
            </Link>

            {isAuthenticated && (
              <>
                <Link href="/listings/create" className="text-sm text-mid py-3 border-b divider hover:text-accent transition-colors" onClick={closeMobile}>
                  Post Item
                </Link>
                <Link href="/dashboard" className="text-sm text-mid py-3 border-b divider hover:text-accent transition-colors" onClick={closeMobile}>
                  Dashboard
                </Link>
                <Link href="/chat" className="text-sm text-mid py-3 border-b divider hover:text-accent transition-colors" onClick={closeMobile}>
                  Chats
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin" className="text-sm text-danger font-medium py-3 border-b divider" onClick={closeMobile}>
                    Admin
                  </Link>
                )}
                <div className="py-3">
                  <p className="text-xs text-lo mb-2">{user?.email}</p>
                  <button onClick={handleLogout} className="text-sm text-danger w-full text-left hover:opacity-70 transition-opacity">
                    Logout
                  </button>
                </div>
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link href="/login" className="text-sm text-mid py-3 border-b divider hover:text-accent transition-colors" onClick={closeMobile}>
                  Login
                </Link>
                <div className="pt-3">
                  <Link href="/register" className="btn-primary block text-sm px-4 py-2 rounded-lg text-center" onClick={closeMobile}>
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
