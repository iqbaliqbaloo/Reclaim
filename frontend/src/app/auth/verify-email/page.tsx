'use client'

import { useEffect, useState, Suspense } from 'react'
import Link                              from 'next/link'
import { useSearchParams }               from 'next/navigation'
import { authApi }                       from '@/utils/axios'

type Status = 'loading' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams        = useSearchParams()
  const [status,  setStatus]  = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return }
    authApi.get(`/api/auth/verify-email/${token}`)
      .then(res => { setStatus('success'); setMessage(res.data.message) })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.error || 'Verification failed.') })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-10 w-full max-w-md text-center animate-fade-up">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">🔍</div>
            <p className="text-mid text-sm">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-hi mb-2">Email verified!</h2>
            <p className="text-mid text-sm mb-6 leading-relaxed">{message}</p>
            <Link href="/login" className="btn-primary inline-block px-6 py-2.5 rounded-lg text-sm">
              Sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-hi mb-2">Verification failed</h2>
            <p className="text-mid text-sm mb-6 leading-relaxed">{message}</p>
            <Link href="/register" className="text-accent text-sm hover:opacity-70 transition-opacity">
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mid text-sm">Loading…</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
