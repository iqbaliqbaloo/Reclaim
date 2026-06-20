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
      await authApi.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your inbox</h2>
          <p className="text-gray-500 text-sm mb-4">
            If an account exists for <strong>{email}</strong>, a reset link was sent.
          </p>
          <Link href="/login" className="text-blue-600 text-sm hover:underline">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Forgot password</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your email for a reset link.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm
                       font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <Link href="/login" className="block text-center text-sm text-gray-500 mt-4 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}