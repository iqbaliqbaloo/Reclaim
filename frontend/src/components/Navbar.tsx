'use client'

import Link          from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth }   from '@/store/authStore'
import NotificationBell from './NotificationBell'
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    console.log('[Navbar] logout')
    await logout()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        <Link href="/" className="text-xl font-bold text-blue-600">
          Reclaim
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/listings" className="text-sm text-gray-600 hover:text-blue-600">
            Browse
          </Link>

          {isAuthenticated && (
            <>
              <Link href="/listings/create" className="text-sm text-gray-600 hover:text-blue-600">
                Post Item
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">
                Dashboard
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-sm text-red-500 font-medium hover:text-red-700">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  Logout
                </button>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600">
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}