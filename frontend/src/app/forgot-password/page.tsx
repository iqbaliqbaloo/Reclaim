'use client'

import { useState, FormEvent } from 'react'
import Link                    from 'next/link'
import { authApi }             from '@/utils/axios'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.post('/api/auth/forget-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center animate-fade-up">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-hi mb-2">Check your inbox</h2>
          <p className="text-mid text-sm mb-6 leading-relaxed">
            If an account exists for <strong className="text-hi">{email}</strong>, a reset link was sent.
          </p>
          <Link href="/login" className="text-accent text-sm hover:opacity-70 transition-opacity">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-hi mb-1">Forgot password?</h1>
          <p className="text-mid text-sm">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <div className="card p-8">
          {error && <div className="banner-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="input-field px-4 py-2.5 text-sm"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-lg text-sm">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <Link href="/login" className="block text-center text-sm text-mid mt-5 hover:text-accent transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
