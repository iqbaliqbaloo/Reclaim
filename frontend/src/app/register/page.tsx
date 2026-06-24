'use client'

import { useState, FormEvent } from 'react'
import Link                    from 'next/link'
import { useAuth }             from '@/store/authStore'
import { authApi }             from '@/utils/axios'

export default function RegisterPage() {
  const { register } = useAuth()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(null)
    setLoading(true)
    try {
      await register(email, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendMsg(null)
    try {
      await authApi.post('/api/auth/resend-verification', { email })
      setResendMsg('Verification email resent. Please check your inbox.')
    } catch (err: any) {
      setResendMsg(err.response?.data?.error || 'Failed to resend. Try again.')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 w-full max-w-md text-center animate-fade-up">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-semibold text-hi mb-2">Check your inbox</h2>
          <p className="text-mid text-sm leading-relaxed mb-6">
            We sent a verification link to{' '}
            <strong className="text-hi">{email}</strong>.
            Click the link to activate your account.
          </p>

          {resendMsg && (
            <div className={`banner-${resendMsg.includes('resent') ? 'info' : 'error'} mb-4 text-sm`}>
              {resendMsg}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending}
            className="btn-ghost w-full py-2.5 rounded-lg text-sm mb-4"
          >
            {resending ? 'Sending…' : "Didn't receive it? Resend"}
          </button>

          <p className="text-xs text-lo">
            Already verified?{' '}
            <Link href="/login" className="text-accent hover:opacity-70 transition-opacity">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-up">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-1">Reclaim</h1>
          <p className="text-hi font-semibold text-lg">Create account</p>
          <p className="text-mid text-sm mt-1">Join the community</p>
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

            <div>
              <label className="form-label">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters" required minLength={6}
                className="input-field px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="form-label">Confirm password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password" required
                className={`input-field px-4 py-2.5 text-sm ${confirm && confirm !== password ? 'border-red-500/50' : ''}`}
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-danger mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 rounded-lg text-sm"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t divider" />
            <span className="px-3 text-xs text-lo">or</span>
            <div className="flex-1 border-t divider" />
          </div>

          <a
            href={`${process.env.NEXT_PUBLIC_AUTH_URL}/api/auth/google`}
            className="btn-ghost w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <p className="text-center text-sm text-mid mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:opacity-70 transition-opacity">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
