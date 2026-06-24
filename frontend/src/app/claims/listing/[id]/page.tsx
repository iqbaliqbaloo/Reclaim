'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link                     from 'next/link'
import { claimApi }             from '@/utils/axios'
import Navbar                   from '@/components/Navbar'
import type { Claim }           from '@/types'

export default function ReviewClaimsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [claims,    setClaims]    = useState<Claim[]>([])
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState<number | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => { loadClaims() }, [params.id])

  const loadClaims = async () => {
    try {
      const res = await claimApi.get<{ success: boolean; data: Claim[] }>(
        `/claims/listing/${params.id}`
      )
      setClaims(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (claimId: number) => {
    if (!window.confirm('Approve this claim? All other pending claims will be rejected and a chat will open.')) return
    setActioning(claimId); setError(null)
    try {
      await claimApi.put(`/claims/${claimId}/approve`)
      router.push('/chat')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Approve failed')
    } finally {
      setActioning(null)
    }
  }

  const handleReject = async (claimId: number) => {
    if (!window.confirm('Reject this claim?')) return
    setActioning(claimId); setError(null)
    try {
      await claimApi.put(`/claims/${claimId}/reject`)
      setClaims(prev => prev.filter(c => c.id !== claimId))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reject failed')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <Link href={`/listings/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-lo hover:text-mid transition-colors mb-5">
          ← Back to listing
        </Link>

        <h1 className="text-2xl font-bold text-hi mb-2">Review claims</h1>
        <p className="text-sm text-mid mb-6 leading-relaxed">
          Read each claim carefully. Approving one automatically rejects all others and opens a chat.
        </p>

        {error && <div className="banner-error mb-5">{error}</div>}

        {loading && (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-40" />)}
          </div>
        )}

        {!loading && claims.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-mid text-sm">No pending claims on this listing yet</p>
          </div>
        )}

        {claims.length > 0 && (
          <div className="space-y-4">
            {claims.map(claim => (
              <div key={claim.id} className="card p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-lo">
                    Submitted {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                  <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                </div>

                <div className="detail-box mb-5">
                  <p className="text-sm text-mid leading-relaxed">{claim.claim_description}</p>
                </div>

                {claim.status === 'pending' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(claim.id)} disabled={actioning === claim.id}
                      className="flex-1 btn-success py-2.5 rounded-lg text-sm">
                      {actioning === claim.id ? 'Processing…' : '✓ Approve claim'}
                    </button>
                    <button onClick={() => handleReject(claim.id)} disabled={actioning === claim.id}
                      className="flex-1 btn-danger py-2.5 rounded-lg text-sm">
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
