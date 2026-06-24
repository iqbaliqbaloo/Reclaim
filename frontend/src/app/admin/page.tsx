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
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return }
    if (user?.role === 'admin') loadStats()
  }, [isLoading, user])

  const loadStats = async () => {
    try {
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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-hi">Admin Panel</h1>
          <p className="text-sm text-lo mt-1">System overview and management</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="stat-card">
            <div className="stat-number">{statsLoading ? '—' : stats?.totalListings ?? 0}</div>
            <div className="text-xs text-lo mt-1">Total listings</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1))', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="text-3xl font-bold text-danger">{statsLoading ? '—' : stats?.openReports ?? 0}</div>
            <div className="text-xs text-lo mt-1">Open reports</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/admin/reports"
            className="card card-hover p-6 group"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(255,255,255,0.02))' }}>
            <div className="text-2xl mb-3">🚩</div>
            <p className="font-semibold text-hi mb-1 group-hover:text-accent transition-colors">Reports queue</p>
            <p className="text-sm text-lo">Review flagged listings, chats, and users</p>
          </Link>
          <Link href="/admin/users"
            className="card card-hover p-6 group"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(255,255,255,0.02))' }}>
            <div className="text-2xl mb-3">👥</div>
            <p className="font-semibold text-hi mb-1 group-hover:text-accent transition-colors">Manage users</p>
            <p className="text-sm text-lo">Ban, unban, and review user accounts</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
