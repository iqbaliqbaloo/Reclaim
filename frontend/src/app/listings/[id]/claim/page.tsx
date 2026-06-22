/*
  ============================================================
  CLAIM PAGE — /listings/[id]/claim
  Lost user submits a claim on a found listing

  DATA FLOW:
  ON LOAD: GET /listings/:id → fetch listing details
  ON SUBMIT: POST /claims
    Body: { listingId, claimDescription }
  ============================================================
*/

'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useParams, useRouter }           from 'next/navigation'
import Link                               from 'next/link'
import { listingApi, claimApi }           from '@/utils/axios'
import { useAuth }                        from '@/store/authStore'
import Navbar                             from '@/components/Navbar'
import type { Listing }                   from '@/types'

export default function ClaimPage() {
  const params   = useParams<{ id: string }>()
  const router   = useRouter()
  const { user } = useAuth()

  const [listing,     setListing]     = useState<Listing | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [description, setDescription] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    listingApi.get<{ success: boolean; data: Listing }>(`/listings/${params.id}`)
      .then(res => {
        console.log('[Claim] listing loaded:', res.data.data.id)
        setListing(res.data.data)
      })
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  /*
    DATA SENT:
    POST /claims
    Header: Authorization: Bearer token
    Body: { listingId, claimDescription }
    Form: JSON

    DATA RECEIVED:
    { success: true, data: { claim }, message: "Claim submitted" }
  */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    console.log('[Claim] submitting claim for listing:', params.id)
    console.log('[Claim] description length:', description.length)

    try {
      const res = await claimApi.post('/claims', {
        listingId:        Number(params.id),
        claimDescription: description
      })

      console.log('[Claim] claim submitted:', res.data.data)
      router.push('/dashboard?claimed=true')
    } catch (err: any) {
      const msg = err.response?.data?.error ||
                  err.response?.data?.details?.[0]?.message ||
                  'Failed to submit claim'
      console.log('[Claim] error:', msg)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <p className="text-center text-gray-400 text-sm py-12">Loading...</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">
          <p className="text-red-500 text-sm">Listing not found</p>
          <Link href="/listings" className="text-blue-600 text-sm hover:underline mt-2 block">
            Back to listings
          </Link>
        </div>
      </div>
    )
  }

  // safety check — cannot claim own listing or non-found listings
  if (user?.userId === listing.user_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">You cannot claim your own listing.</p>
        </div>
      </div>
    )
  }

  if (listing.type !== 'found' || listing.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">This listing cannot be claimed.</p>
        </div>
      </div>
    )
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

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Claim this item</h1>
        <p className="text-sm text-gray-500 mb-6">
          Describe your lost item to prove ownership. The finder will read this
          and decide whether to approve your claim.
        </p>

        {/* Listing preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
              Found
            </span>
            <span className="text-xs text-gray-400 capitalize">{listing.category}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">{listing.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{listing.description}</p>
          <p className="text-xs text-gray-400 mt-2">📍 {listing.location_label}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe your lost item <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Be specific — color, brand, distinguishing marks, what's inside,
              where exactly you lost it. The more detail, the better.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My wallet is brown leather with a torn corner on the left side. It contains 3 bank cards and a small photo of my daughter in the back pocket. I lost it near..."
              required
              minLength={20}
              maxLength={2000}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {description.length}/2000 (minimum 20 characters)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs text-blue-700">
              ℹ️ The finder has 72 hours to review your claim. If approved, a private
              chat will open so you can arrange the return.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || description.length < 20}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm
                       font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit claim'}
          </button>
        </form>

      </div>
    </div>
  )
}