'use client'

import { useState, useEffect }       from 'react'
import { useParams, useRouter }      from 'next/navigation'
import Link                          from 'next/link'
import { listingApi }                from '@/utils/axios'
import { useAuth }                   from '@/store/authStore'
import Navbar                        from '@/components/Navbar'
import type { Listing }              from '@/types'

const categoryIcons: Record<string, string> = {
  electronics: '📱', wallet: '👛', keys: '🔑',
  pets: '🐾', bags: '🎒', documents: '📄',
  clothing: '👕', other: '📦'
}

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
    listingApi.get<{ success: boolean; data: Listing }>(`/listings/${params.id}`)
      .then(res => {
        console.log('[ListingDetail] received:', res.data.data.id)
        setListing(res.data.data)
      })
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  /*
    DELETE /listings/:id
    Header: Authorization: Bearer token
  */
  const handleDelete = async () => {
    if (!window.confirm('Delete this listing?')) return
    setDeleting(true)
    try {
      await listingApi.delete(`/listings/${params.id}`)
      router.push('/dashboard')
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  /*
    PUT /listings/:id/resolve
    Header: Authorization: Bearer token
  */
  const handleResolve = async () => {
    if (!window.confirm('Mark as resolved?')) return
    setResolving(true)
    try {
      const res = await listingApi.put<{ success: boolean; data: Listing }>(
        `/listings/${params.id}/resolve`
      )
      setListing(prev => prev ? { ...prev, status: res.data.data.status } : prev)
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Resolve failed')
    } finally {
      setResolving(false)
    }
  }

  const isOwner = user && listing && user.userId === listing.user_id
  const canClaim = user && listing && listing.type === 'found' &&
                   listing.status === 'active' && !isOwner

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {loading && <p className="text-center text-gray-400 text-sm py-12">Loading...</p>}
        {error   && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <Link href="/listings" className="text-blue-600 text-sm hover:underline">Back to listings</Link>
          </div>
        )}

        {listing && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Images */}
            {listing.images && listing.images.length > 0 && (
              <div>
                <div className="aspect-video bg-gray-100">
                  <img
                    src={listing.images[activeImage]?.url ?? ''}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.images.length > 1 && (
                  <div className="flex gap-2 p-3 bg-gray-50">
                    {listing.images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2
                          ${activeImage === idx ? 'border-blue-500' : 'border-transparent'}`}
                      >
                        <img src={img.url ?? ''} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                  ${listing.type === 'lost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {listing.type === 'lost' ? 'Lost' : 'Found'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                  ${listing.status === 'active' ? 'bg-blue-50 text-blue-600'
                    : listing.status === 'resolved' ? 'bg-green-50 text-green-600'
                    : 'bg-gray-50 text-gray-500'}`}>
                  {listing.status}
                </span>
                {listing.reward_offered && (
                  <span className="text-xs bg-yellow-50 text-yellow-600 font-medium px-2.5 py-1 rounded-full">
                    💰 Reward
                  </span>
                )}
                <span className="text-xs text-gray-400 capitalize ml-auto">
                  {categoryIcons[listing.category]} {listing.category}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">{listing.title}</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{listing.description}</p>

              {listing.reward_offered && listing.reward_note && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-sm text-yellow-700"><strong>Reward:</strong> {listing.reward_note}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Location</p>
                  {/* Only location_label shown — never exact GPS */}
                  <p className="text-gray-700">📍 {listing.location_label}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date</p>
                  <p className="text-gray-700">📅 {new Date(listing.date_occurred).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Posted</p>
                  <p className="text-gray-700">{new Date(listing.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Posted by</p>
                  <Link href={`/profile/${listing.user_id}`} className="text-blue-600 hover:underline text-sm">
                    View profile
                  </Link>
                </div>
              </div>

              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {canClaim && (
                  <Link
                    href={`/listings/${params.id}/claim`}
                    className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Claim this item
                  </Link>
                )}

                {isOwner && listing.status === 'active' && (
                  <>
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {resolving ? 'Resolving...' : 'Mark resolved'}
                    </button>
                    <Link
                      href={`/listings/${params.id}/edit`}
                      className="border border-gray-300 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="border border-red-200 text-red-500 text-sm px-4 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}

                {!user && listing.type === 'found' && listing.status === 'active' && (
                  <Link href="/login" className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-700">
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