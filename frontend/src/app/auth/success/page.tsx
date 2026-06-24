'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth }    from '@/store/authStore'

function AuthSuccessContent() {
  const { loginWithGoogle } = useAuth()
  const router              = useRouter()
  const searchParams        = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { router.push('/login?error=auth_failed'); return }
    loginWithGoogle(token)
      .then(() => router.push('/dashboard'))
      .catch(() => router.push('/login?error=auth_failed'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="text-4xl mb-4 animate-pulse">🔐</div>
        <p className="text-mid text-sm">Completing sign in…</p>
      </div>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mid text-sm">Loading…</p>
      </div>
    }>
      <AuthSuccessContent />
    </Suspense>
  )
}
