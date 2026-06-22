/*
  ============================================================
  ADMIN USERS PAGE — /admin/users
  List all users, ban/unban

  DATA FLOW:
  GET /admin/users
  PUT /admin/users/:id/ban
  PUT /admin/users/:id/unban
  ============================================================
*/

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

  const [users,     setUsers]     = useState<UserProfile[]>([])
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
      console.log('[AdminUsers] loaded:', res.data.data.length)
      setUsers(res.data.data)
    } catch (err: any) {
      console.error('[AdminUsers] error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  /*
    DATA SENT:
    PUT /admin/users/:id/ban
    Body: { reason }
  */
  const handleBan = async (id: number) => {
    if (!banReason.trim()) return
    setActioning(id)
    try {
      console.log('[AdminUsers] banning:', id, banReason)
      await adminApi.put(`/admin/users/${id}/ban`, { reason: banReason })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: true, ban_reason: banReason } : u))
      setBanTarget(null)
      setBanReason('')
    } catch (err: any) {
      console.error('[AdminUsers] ban error:', err.message)
    } finally {
      setActioning(null)
    }
  }

  const handleUnban = async (id: number) => {
    setActioning(id)
    try {
      console.log('[AdminUsers] unbanning:', id)
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Manage users</h1>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Reputation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500">{u.reputation}</td>
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">
                          Banned: {u.ban_reason}
                        </span>
                      ) : (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : u.is_banned ? (
                        <button
                          onClick={() => handleUnban(u.id)}
                          disabled={actioning === u.id}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Unban
                        </button>
                      ) : banTarget === u.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={banReason}
                            onChange={e => setBanReason(e.target.value)}
                            placeholder="Reason"
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-32"
                          />
                          <button
                            onClick={() => handleBan(u.id)}
                            disabled={actioning === u.id || !banReason.trim()}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBanTarget(u.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}