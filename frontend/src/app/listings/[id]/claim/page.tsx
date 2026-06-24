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
    listingApi.get<{ success: boolean; data: Listing }>(`/api/listings/${params.id}`)
      .then(res => setListing(res.data.data))
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      await claimApi.post('/claims', {
        listingId:        Number(params.id),
        claimDescription: description
      })
      router.push('/dashboard?claimed=true')
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Failed to submit claim'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-16">
          <p className="text-danger text-sm mb-3">Listing not found</p>
          <Link href="/listings" className="text-accent text-sm hover:opacity-70 transition-opacity">
            Back to listings
          </Link>
        </div>
      </div>
    )
  }

  if (user?._id === listing.user_id) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-16">
          <p className="text-mid text-sm">You cannot claim your own listing.</p>
        </div>
      </div>
    )
  }

  if (listing.type !== 'found' || listing.status !== 'active') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-16">
          <p className="text-mid text-sm">This listing cannot be claimed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <Link href={`/listings/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-lo hover:text-mid transition-colors mb-5">
          ← Back to listing
        </Link>

        <h1 className="text-2xl font-bold text-hi mb-2">Claim this item</h1>
        <p className="text-sm text-mid mb-6 leading-relaxed">
          Describe your lost item to prove ownership. The finder will read this and decide whether to approve.
        </p>

        {/* Listing preview */}
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-found">Found</span>
            <span className="text-xs text-lo capitalize">{listing.category}</span>
          </div>
          <h3 className="text-sm font-semibold text-hi">{listing.title}</h3>
          <p className="text-xs text-mid mt-1 leading-relaxed">{listing.description}</p>
          <p className="text-xs text-lo mt-2">📍 {listing.location_label}</p>
        </div>

        {error && <div className="banner-error mb-5">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-5">
            <label className="form-label mb-1">
              Describe your lost item <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-lo mb-3 leading-relaxed">
              Be specific — color, brand, distinguishing marks, what&apos;s inside,
              where exactly you lost it. The more detail, the better.
            </p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="My wallet is brown leather with a torn corner…"
              required minLength={20} maxLength={2000} rows={6}
              className="input-field px-3 py-2.5 text-sm resize-none"
            />
            <p className="text-xs text-lo mt-1.5">
              {description.length}/2000 (min 20 chars)
            </p>
          </div>

          <div className="banner-info text-xs leading-relaxed">
            The finder has 72 hours to review. If approved, a private chat will open.
          </div>

          <button
            type="submit"
            disabled={submitting || description.length < 20}
            className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold"
          >
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
        </form>

      </div>
    </div>
  )
}
