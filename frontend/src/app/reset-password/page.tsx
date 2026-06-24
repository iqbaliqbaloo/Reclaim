'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link                              from 'next/link'
import { useRouter, useSearchParams }    from 'next/navigation'
import { authApi }                       from '@/utils/axios'

function ResetPasswordContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.post(`/api/auth/reset-password/${token}`, { newPassword: password })
      router.push('/login?reset=success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center animate-fade-up">
          <div className="text-4xl mb-4">🔗</div>
          <p className="text-danger mb-4">Invalid reset link.</p>
          <Link href="/forgot-password" className="text-accent text-sm hover:opacity-70 transition-opacity">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-hi mb-1">Set new password</h1>
          <p className="text-mid text-sm">Enter a new password for your account.</p>
        </div>

        <div className="card p-8">
          {error && <div className="banner-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">New password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" required minLength={6}
                className="input-field px-4 py-2.5 text-sm"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-lg text-sm">
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mid text-sm">Loading…</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
