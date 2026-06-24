'use client'

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { claimApi }            from '@/utils/axios'
import Navbar                  from '@/components/Navbar'
import type { Claim }          from '@/types'

export default function MyClaimsPage() {
  const [claims,  setClaims]  = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    claimApi.get<{ success: boolean; data: Claim[] }>('/claims/my')
      .then(res => setClaims(res.data.data))
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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-hi mb-6">My Claims</h1>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28" />)}
          </div>
        )}

        {!loading && claims.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-mid text-sm mb-4">You haven&apos;t submitted any claims yet</p>
            <Link href="/listings" className="btn-primary inline-block px-6 py-2.5 rounded-lg text-sm">
              Browse found listings
            </Link>
          </div>
        )}

        {claims.length > 0 && (
          <div className="space-y-3">
            {claims.map(claim => (
              <div key={claim.id} className="card p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                  {claim.status === 'pending' && (
                    <span className="text-xs text-lo">{getTimeRemaining(claim.expires_at)}</span>
                  )}
                </div>

                <p className="text-sm text-mid mb-4 leading-relaxed">{claim.claim_description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-lo">
                    Submitted {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                  <Link href={`/listings/${claim.listing_id}`}
                    className="text-xs text-accent hover:opacity-70 transition-opacity">
                    View listing →
                  </Link>
                </div>

                {claim.status === 'approved' && (
                  <div className="banner-success mt-4">
                    <p className="mb-2">Your claim was approved! Chat is now open.</p>
                    <Link href="/chat" className="font-semibold hover:opacity-70 transition-opacity text-sm">
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
