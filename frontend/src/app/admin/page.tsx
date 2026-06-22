/*
  ============================================================
  ADMIN DASHBOARD — /admin
  Overview with stats and quick links

  DATA FLOW: GET /admin/stats
  ============================================================
*/

'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'
import { adminApi }            from '@/utils/axios'
import { useAuth }             from '@/store/authStore'
import Navbar                  from '@/components/Navbar'
import type { AdminStats }     from '@/types'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [stats,        setStats]        = useState<AdminStats | null>(null)
  const [statsLoading,  setStatsLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/')
      return
    }
    if (user?.role === 'admin') {
      loadStats()
    }
  }, [isLoading, user])

  const loadStats = async () => {
    try {
      console.log('[Admin] loading stats')
      const res = await adminApi.get<{ success: boolean; data: AdminStats }>('/admin/stats')
      setStats(res.data.data)
    } catch (err: any) {
      console.error('[Admin] stats error:', err.message)
    } finally {
      setStatsLoading(false)
    }
  }

  if (isLoading || user?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-blue-600">
              {statsLoading ? '...' : stats?.totalListings ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total listings</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-red-600">
              {statsLoading ? '...' : stats?.openReports ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Open reports</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/admin/reports"
            className="bg-white rounded-xl border border-gray-200 p-5
                       hover:border-blue-300 hover:shadow-sm"
          >
            <p className="text-lg font-semibold text-gray-800 mb-1">📋 Reports queue</p>
            <p className="text-sm text-gray-500">Review flagged listings, chats, and users</p>
          </Link>
          <Link
            href="/admin/users"
            className="bg-white rounded-xl border border-gray-200 p-5
                       hover:border-blue-300 hover:shadow-sm"
          >
            <p className="text-lg font-semibold text-gray-800 mb-1">👥 Manage users</p>
            <p className="text-sm text-gray-500">Ban or unban users</p>
          </Link>
        </div>
      </div>
    </div>
  )
}