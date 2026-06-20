'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth }   from '@/store/authStore'
import Navbar        from '@/components/Navbar'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router              = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/')
    }
  }, [isLoading, user])

  if (isLoading) return <p className="text-center py-12 text-gray-400">Loading...</p>
  if (user?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>
        <p className="text-gray-500 text-sm">Admin panel coming when admin-service is built.</p>
      </div>
    </div>
  )
}