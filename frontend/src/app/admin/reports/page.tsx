'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { adminApi }            from '@/utils/axios'
import { useAuth }             from '@/store/authStore'
import Navbar                  from '@/components/Navbar'
import type { Report }         from '@/types'

const priorityConfig: Record<number, { label: string; badge: string }> = {
  1: { label: 'Critical', badge: 'badge-rejected' },
  2: { label: 'High',     badge: 'badge-pending'  },
  3: { label: 'Medium',   badge: 'badge-match'    },
  4: { label: 'Low',      badge: 'badge-removed'  }
}

export default function AdminReportsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [reports,   setReports]   = useState<Report[]>([])
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return }
    if (user?.role === 'admin') loadReports()
  }, [isLoading, user])

  const loadReports = async () => {
    try {
      const res = await adminApi.get<{ success: boolean; data: Report[] }>('/admin/reports')
      setReports(res.data.data)
    } catch (err: any) {
      console.error('[AdminReports] error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: number, action: 'resolved' | 'dismissed') => {
    setActioning(id)
    try {
      await adminApi.put(`/admin/reports/${id}/resolve`, { action })
      setReports(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      console.error('[AdminReports] action error:', err.message)
    } finally {
      setActioning(null)
    }
  }

  if (isLoading || user?.role !== 'admin') return null

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-hi mb-6">Reports queue</h1>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-36" />)}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-mid text-sm">No open reports — all clear!</p>
          </div>
        )}

        {reports.length > 0 && (
          <div className="space-y-3">
            {reports.map(report => {
              const prio = priorityConfig[report.priority ?? 4]
              return (
                <div key={report.id} className="card p-5 animate-fade-up">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`badge ${prio.badge}`}>{prio.label}</span>
                    <span className="text-xs text-lo capitalize">{report.target_type}</span>
                    <span className="text-xs text-lo">#{report.target_id}</span>
                  </div>

                  <p className="text-sm text-mid mb-4 leading-relaxed">{report.reason}</p>

                  <p className="text-xs text-lo mb-4">
                    Reported {new Date(report.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <button onClick={() => handleAction(report.id, 'resolved')} disabled={actioning === report.id}
                      className="btn-success text-xs px-4 py-2 rounded-lg">
                      ✓ Mark resolved
                    </button>
                    <button onClick={() => handleAction(report.id, 'dismissed')} disabled={actioning === report.id}
                      className="btn-ghost text-xs px-4 py-2 rounded-lg">
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
