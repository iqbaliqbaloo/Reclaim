'use client'

import { useState, useEffect }       from 'react'
import { useParams, useRouter }      from 'next/navigation'
import Link                          from 'next/link'
import { listingApi }                from '@/utils/axios'
import { useAuth }                   from '@/store/authStore'
import Navbar                        from '@/components/Navbar'
import type { Listing }              from '@/types'

export default function ListingDetailPage() {
  const params   = useParams<{ id: string }>()
  const { user } = useAuth()
  const router   = useRouter()

  const [listing,     setListing]     = useState<Listing | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [deleting,    setDeleting]    = useState(false)
  const [resolving,   setResolving]   = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    listingApi.get<{ success: boolean; data: Listing }>(`/api/listings/${params.id}`)
      .then(res => setListing(res.data.data))
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing?')) return
    setDeleting(true)
    try {
      await listingApi.delete(`/api/listings/${params.id}`)
      router.push('/dashboard')
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleResolve = async () => {
    if (!window.confirm('Mark as resolved?')) return
    setResolving(true)
    try {
      const res = await listingApi.put<{ success: boolean; data: Listing }>(
        `/api/listings/${params.id}/resolve`
      )
      setListing(prev => prev ? { ...prev, status: res.data.data.status } : prev)
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Resolve failed')
    } finally {
      setResolving(false)
    }
  }

  const isOwner = user && listing && user._id === listing.user_id
  const canClaim = user && listing && listing.type === 'found' &&
                   listing.status === 'active' && !isOwner

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {loading && (
          <div className="space-y-3">
            <div className="skeleton h-64 w-full" />
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}
        {error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-danger text-sm mb-3">{error}</p>
            <Link href="/listings" className="text-accent text-sm hover:opacity-70 transition-opacity">
              Back to listings
            </Link>
          </div>
        )}

        {listing && (
          <div className="card overflow-hidden animate-fade-up">

            {/* Images */}
            {listing.images && listing.images.length > 0 && (
              <div>
                <div className="aspect-video bg-black/30">
                  <img
                    src={listing.images[activeImage]?.url ?? ''}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {listing.images.map((img, idx) => (
                      <button key={img.id} onClick={() => setActiveImage(idx)}
                        className="w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all duration-200"
                        style={{ border: `2px solid ${activeImage === idx ? '#3b82f6' : 'rgba(255,255,255,0.12)'}` }}>
                        <img src={img.url ?? ''} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-5 sm:p-7">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`badge ${listing.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                  {listing.type === 'lost' ? 'Lost' : 'Found'}
                </span>
                <span className={`badge badge-${listing.status}`}>{listing.status}</span>
                {listing.reward_offered && <span className="badge badge-reward">🏆 Reward</span>}
                <span className="text-xs text-lo capitalize ml-auto">{listing.category}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-hi mb-3">{listing.title}</h1>
              <p className="text-sm text-mid leading-relaxed mb-5">{listing.description}</p>

              {listing.reward_offered && listing.reward_note && (
                <div className="banner-warn mb-5">
                  🏆 <strong>Reward:</strong> {listing.reward_note}
                </div>
              )}

              <div className="detail-box grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="section-label mb-1">Location</p>
                  <p className="text-mid">📍 {listing.location_label}</p>
                </div>
                <div>
                  <p className="section-label mb-1">Date occurred</p>
                  <p className="text-mid">📅 {new Date(listing.date_occurred).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="section-label mb-1">Posted</p>
                  <p className="text-mid">{new Date(listing.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {actionError && <div className="banner-error mb-5">{actionError}</div>}

              <div className="flex flex-wrap gap-3">
                {canClaim && (
                  <Link href={`/listings/${params.id}/claim`}
                    className="btn-primary px-6 py-2.5 rounded-lg text-sm">
                    Claim this item
                  </Link>
                )}

                {isOwner && listing.status === 'active' && (
                  <>
                    <button onClick={handleResolve} disabled={resolving}
                      className="btn-success px-5 py-2.5 rounded-lg text-sm">
                      {resolving ? 'Resolving…' : '✓ Mark resolved'}
                    </button>
                    <Link href={`/claims/listing/${params.id}`}
                      className="btn-ghost px-5 py-2.5 rounded-lg text-sm">
                      Review claims
                    </Link>
                    <button onClick={handleDelete} disabled={deleting}
                      className="btn-danger px-5 py-2.5 rounded-lg text-sm">
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                )}

                {!user && listing.type === 'found' && listing.status === 'active' && (
                  <Link href="/login" className="btn-primary px-6 py-2.5 rounded-lg text-sm">
                    Login to claim
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
