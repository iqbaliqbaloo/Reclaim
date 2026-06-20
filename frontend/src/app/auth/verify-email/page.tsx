'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { useSearchParams }     from 'next/navigation'
import { authApi }             from '@/utils/axios'
import { Suspense }            from 'react'

type Status = 'loading' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams        = useSearchParams()
  const [status,  setStatus]  = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    console.log('[VerifyEmail] token:', token ? 'PRESENT' : 'MISSING')

    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    authApi.get(`/api/auth/verify-email/${token}`)
      .then(res => { setStatus('success'); setMessage(res.data.message) })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.error || 'Failed.') })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center">
        {status === 'loading' && <p className="text-gray-500 text-sm">Verifying...</p>}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Email verified</h2>
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            <Link href="/login" className="text-blue-600 text-sm hover:underline">Go to login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verification failed</h2>
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            <Link href="/register" className="text-blue-600 text-sm hover:underline">Register again</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}