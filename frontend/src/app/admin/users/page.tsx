'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { adminApi }            from '@/utils/axios'
import { useAuth }             from '@/store/authStore'
import Navbar                  from '@/components/Navbar'
import type { UserProfile }    from '@/types'

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [users,      setUsers]      = useState<UserProfile[]>([])
  const [loading,    setLoading]    = useState(true)
  const [actioning,  setActioning]  = useState<number | null>(null)
  const [banReason,  setBanReason]  = useState('')
  const [banTarget,  setBanTarget]  = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') { router.push('/'); return }
    if (user?.role === 'admin') loadUsers()
  }, [isLoading, user])

  const loadUsers = async () => {
    try {
      const res = await adminApi.get<{ success: boolean; data: UserProfile[] }>('/admin/users')
      setUsers(res.data.data)
    } catch (err: any) {
      console.error('[AdminUsers] error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async (id: number) => {
    if (!banReason.trim()) return
    setActioning(id)
    try {
      await adminApi.put(`/admin/users/${id}/ban`, { reason: banReason })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: true, ban_reason: banReason } : u))
      setBanTarget(null); setBanReason('')
    } catch (err: any) {
      console.error('[AdminUsers] ban error:', err.message)
    } finally {
      setActioning(null)
    }
  }

  const handleUnban = async (id: number) => {
    setActioning(id)
    try {
      await adminApi.put(`/admin/users/${id}/unban`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: false, ban_reason: null } : u))
    } catch (err: any) {
      console.error('[AdminUsers] unban error:', err.message)
    } finally {
      setActioning(null)
    }
  }

  if (isLoading || user?.role !== 'admin') return null

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-hi mb-6">Manage users</h1>

        {loading && <div className="skeleton h-60 w-full" />}

        {!loading && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-glass min-w-150">
                <thead>
                  <tr>
                    <th className="text-left">Email</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">Rep</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="text-sm">{u.email}</td>
                      <td><span className="text-lo capitalize text-xs">{u.role}</span></td>
                      <td><span className="badge badge-match">{u.reputation}</span></td>
                      <td>
                        {u.is_banned ? (
                          <span className="badge badge-rejected">Banned</span>
                        ) : (
                          <span className="badge badge-approved">Active</span>
                        )}
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="text-xs text-lo">—</span>
                        ) : u.is_banned ? (
                          <button onClick={() => handleUnban(u.id)} disabled={actioning === u.id}
                            className="btn-ghost text-xs px-3 py-1 rounded-lg">
                            Unban
                          </button>
                        ) : banTarget === u.id ? (
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text" value={banReason} onChange={e => setBanReason(e.target.value)}
                              placeholder="Reason" maxLength={200}
                              className="input-field text-xs px-2 py-1 rounded-md w-28"
                            />
                            <button onClick={() => handleBan(u.id)} disabled={actioning === u.id || !banReason.trim()}
                              className="btn-danger text-xs px-2 py-1 rounded-lg">
                              Confirm
                            </button>
                            <button onClick={() => { setBanTarget(null); setBanReason('') }}
                              className="text-xs text-lo hover:text-mid transition-colors">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setBanTarget(u.id)}
                            className="btn-danger text-xs px-3 py-1 rounded-lg">
                            Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
