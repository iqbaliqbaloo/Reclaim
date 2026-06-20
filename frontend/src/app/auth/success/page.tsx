'use client'

import { useEffect }  from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth }    from '@/store/authStore'
import { Suspense }   from 'react'

function AuthSuccessContent() {
  const { loginWithGoogle } = useAuth()
  const router              = useRouter()
  const searchParams        = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    console.log('[AuthSuccess] token:', token ? 'PRESENT' : 'MISSING')

    if (!token) {
      router.push('/login?error=auth_failed')
      return
    }

    loginWithGoogle(token)
      .then(user => {
        console.log('[AuthSuccess] complete, role:', user.role)
        router.push('/dashboard')
      })
      .catch(() => router.push('/login?error=auth_failed'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Completing login...</p>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading...</p></div>}>
      <AuthSuccessContent />
    </Suspense>
  )
}