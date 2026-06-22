/*
  ============================================================
  MY CLAIMS PAGE — /claims
  Lost user views all claims they've submitted

  DATA FLOW:
  GET /claims/my
  ============================================================
*/

'use client'

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { claimApi }            from '@/utils/axios'
import Navbar                  from '@/components/Navbar'
import type { Claim }          from '@/types'

const statusColors: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
  expired:  'bg-gray-50 text-gray-500'
}

export default function MyClaimsPage() {
  const [claims,  setClaims]  = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    /*
      DATA SENT: GET /claims/my
      Header: Authorization: Bearer token
      DATA RECEIVED: array of Claim objects
    */
    claimApi.get<{ success: boolean; data: Claim[] }>('/claims/my')
      .then(res => {
        console.log('[MyClaims] claims loaded:', res.data.data.length)
        setClaims(res.data.data)
      })
      .catch(err => console.error('[MyClaims] error:', err.message))
      .finally(() => setLoading(false))
  }, [])

  const getTimeRemaining = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}h remaining`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Claims</h1>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && claims.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm mb-3">You haven't submitted any claims yet</p>
            <Link href="/listings" className="text-blue-600 text-sm hover:underline">
              Browse found listings
            </Link>
          </div>
        )}

        {claims.length > 0 && (
          <div className="space-y-3">
            {claims.map(claim => (
              <div key={claim.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[claim.status]}`}>
                    {claim.status}
                  </span>
                  {claim.status === 'pending' && (
                    <span className="text-xs text-gray-400">
                      {getTimeRemaining(claim.expires_at)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-2">{claim.claim_description}</p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    Submitted {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/listings/${claim.listing_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View listing
                  </Link>
                </div>

                {claim.status === 'approved' && (
                  <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="text-xs text-green-700 mb-2">
                      Your claim was approved! Chat is now open.
                    </p>
                    <Link
                      href="/chat"
                      className="text-xs font-medium text-green-700 hover:underline"
                    >
                      Open chat →
                    </Link>
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