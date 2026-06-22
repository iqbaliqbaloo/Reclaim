/*
  ============================================================
  REVIEW CLAIMS PAGE — /claims/listing/[id]
  Found user (listing owner) reviews claims on their listing

  DATA FLOW:
  GET  /claims/listing/:id  → fetch all pending claims
  PUT  /claims/:id/approve  → approve a claim
  PUT  /claims/:id/reject   → reject a claim
  ============================================================
*/

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

  useEffect(() => {
    loadClaims()
  }, [params.id])

  const loadClaims = async () => {
    try {
      console.log('[ReviewClaims] loading claims for listing:', params.id)
      const res = await claimApi.get<{ success: boolean; data: Claim[] }>(
        `/claims/listing/${params.id}`
      )
      console.log('[ReviewClaims] claims:', res.data.data.length)
      setClaims(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  /*
    DATA SENT:
    PUT /claims/:id/approve
    Header: Authorization: Bearer token

    DATA RECEIVED:
    { success: true, data: { claim, conversationId } }
  */
  const handleApprove = async (claimId: number) => {
    if (!window.confirm('Approve this claim? This will reject all other pending claims and open a chat.')) return

    setActioning(claimId)
    setError(null)

    try {
      console.log('[ReviewClaims] approving claim:', claimId)
      const res = await claimApi.put(`/claims/${claimId}/approve`)
      console.log('[ReviewClaims] approved:', res.data.data)
      router.push('/chat')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Approve failed')
    } finally {
      setActioning(null)
    }
  }

  /*
    DATA SENT:
    PUT /claims/:id/reject
    Header: Authorization: Bearer token
  */
  const handleReject = async (claimId: number) => {
    if (!window.confirm('Reject this claim?')) return

    setActioning(claimId)
    setError(null)

    try {
      console.log('[ReviewClaims] rejecting claim:', claimId)
      await claimApi.put(`/claims/${claimId}/reject`)
      setClaims(prev => prev.filter(c => c.id !== claimId))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reject failed')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <Link
          href={`/listings/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← Back to listing
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Review claims</h1>
        <p className="text-sm text-gray-500 mb-6">
          Read each claim description carefully. Approving one will automatically
          reject all other claims and open a chat with the claimant.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && claims.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">No pending claims on this listing yet</p>
          </div>
        )}

        {claims.length > 0 && (
          <div className="space-y-4">
            {claims.map(claim => (
              <div key={claim.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">
                    Submitted {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/profile/${claim.claimant_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View claimant profile
                  </Link>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {claim.claim_description}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(claim.id)}
                    disabled={actioning === claim.id}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg
                               text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {actioning === claim.id ? 'Processing...' : 'Approve claim'}
                  </button>
                  <button
                    onClick={() => handleReject(claim.id)}
                    disabled={actioning === claim.id}
                    className="flex-1 border border-red-200 text-red-500 py-2.5
                               rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}