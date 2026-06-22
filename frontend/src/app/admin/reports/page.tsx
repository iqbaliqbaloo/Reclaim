/*
  ============================================================
  ADMIN REPORTS QUEUE — /admin/reports
  Priority-ordered list of open reports

  DATA FLOW:
  GET /admin/reports                → load queue
  PUT /admin/reports/:id/resolve    → resolve/dismiss
  ============================================================
*/

'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { adminApi }            from '@/utils/axios'
import { useAuth }             from '@/store/authStore'
import Navbar                  from '@/components/Navbar'
import type { Report }         from '@/types'

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Critical', color: 'bg-red-50 text-red-600' },
  2: { label: 'High',     color: 'bg-orange-50 text-orange-600' },
  3: { label: 'Medium',   color: 'bg-yellow-50 text-yellow-600' },
  4: { label: 'Low',      color: 'bg-gray-50 text-gray-500' }
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
      console.log('[AdminReports] loading queue')
      const res = await adminApi.get<{ success: boolean; data: Report[] }>('/admin/reports')
      console.log('[AdminReports] loaded:', res.data.data.length)
      setReports(res.data.data)
    } catch (err: any) {
      console.error('[AdminReports] error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  /*
    DATA SENT:
    PUT /admin/reports/:id/resolve
    Body: { action: 'resolved' | 'dismissed' }
  */
  const handleAction = async (id: number, action: 'resolved' | 'dismissed') => {
    setActioning(id)
    try {
      console.log('[AdminReports] action:', action, 'on report:', id)
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports queue</h1>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && reports.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">No open reports 🎉</p>
          </div>
        )}

        {reports.length > 0 && (
          <div className="space-y-3">
            {reports.map(report => {
              const priority = priorityLabels[report.priority ?? 4]
              return (
                <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${priority.color}`}>
                      {priority.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{report.target_type}</span>
                    <span className="text-xs text-gray-400">#{report.target_id}</span>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{report.reason}</p>

                  <p className="text-xs text-gray-400 mb-3">
                    Reported {new Date(report.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(report.id, 'resolved')}
                      disabled={actioning === report.id}
                      className="text-xs bg-green-600 text-white px-3 py-1.5
                                 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark resolved
                    </button>
                    <button
                      onClick={() => handleAction(report.id, 'dismissed')}
                      disabled={actioning === report.id}
                      className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5
                                 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
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