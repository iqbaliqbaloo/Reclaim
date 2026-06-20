'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link                               from 'next/link'
import { useAuth }                        from '@/store/authStore'
import { userApi, listingApi, matchApi }  from '@/utils/axios'
import Navbar                             from '@/components/Navbar'
import type { UserProfile, Listing, Match } from '@/types'

export default function DashboardPage() {
  const { user: authUser } = useAuth()

  const [profile,        setProfile]        = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError,   setProfileError]   = useState<string | null>(null)

  const [editMode,    setEditMode]    = useState(false)
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [listings,        setListings]        = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)

  const [matches,        setMatches]        = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    loadMyListings()
    loadMyMatches()
  }, [])

  /*
    DATA SENT: GET /users/me
    Header: Authorization: Bearer token
    DATA RECEIVED: full UserProfile object
  */
  const loadProfile = async () => {
    try {
      console.log('[Dashboard] loading profile...')
      const res  = await userApi.get<{ success: boolean; data: UserProfile }>('/users/me')
      const data = res.data.data
      console.log('[Dashboard] profile:', data)
      setProfile(data)
      setName(data.name  ?? '')
      setPhone(data.phone ?? '')
    } catch (err: any) {
      setProfileError('Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  /*
    DATA SENT: GET /listings/my
    Header: Authorization: Bearer token
    DATA RECEIVED: array of Listing objects
  */
  const loadMyListings = async () => {
    try {
      console.log('[Dashboard] loading listings...')
      const res  = await listingApi.get<{ success: boolean; data: Listing[] }>('/listings/my')
      console.log('[Dashboard] listings:', res.data.data.length)
      setListings(res.data.data)
    } catch {
    } finally {
      setListingsLoading(false)
    }
  }

  /*
    DATA SENT: GET /matches/my
    Header: Authorization: Bearer token
    DATA RECEIVED: array of Match objects
  */
  const loadMyMatches = async () => {
    try {
      console.log('[Dashboard] loading matches...')
      const res  = await matchApi.get<{ success: boolean; data: Match[] }>('/matches/my')
      console.log('[Dashboard] matches:', res.data.data.length)
      setMatches(res.data.data)
    } catch {
    } finally {
      setMatchesLoading(false)
    }
  }

  /*
    DATA SENT: PUT /users/me
    Body: { name, phone }
    Form: JSON
    DATA RECEIVED: updated UserProfile
  */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    console.log('[Dashboard] saving profile:', { name, phone })

    try {
      const res     = await userApi.put<{ success: boolean; data: UserProfile }>(
        '/users/me', { name, phone }
      )
      setProfile(res.data.data)
      setEditMode(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /*
    Dismiss a match
    DATA SENT: PUT /matches/:id/dismiss
    Header: Authorization: Bearer token
  */
  const handleDismissMatch = async (matchId: number) => {
    try {
      console.log('[Dashboard] dismissing match:', matchId)
      await matchApi.put(`/matches/${matchId}/dismiss`)
      setMatches(prev => prev.filter(m => m.id !== matchId))
      console.log('[Dashboard] match dismissed')
    } catch (err: any) {
      console.error('[Dashboard] dismiss error:', err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">My Profile</h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-sm text-blue-600 hover:underline">
                Edit
              </button>
            )}
          </div>

          {profileLoading && <p className="text-sm text-gray-400">Loading...</p>}
          {profileError   && <p className="text-sm text-red-500">{profileError}</p>}

          {profile && !editMode && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{profile.reputation}</div>
                  <div className="text-xs text-gray-500 mt-1">Reputation</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{5 - profile.daily_post_count}</div>
                  <div className="text-xs text-gray-500 mt-1">Posts left today</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">{profile.role}</div>
                  <div className="text-xs text-gray-500 mt-1">Role</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20">Email</span>
                  <span className="text-gray-700">{profile.email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20">Name</span>
                  <span className="text-gray-700">{profile.name ?? <span className="italic text-gray-300">not set</span>}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20">Phone</span>
                  <span className="text-gray-700">{profile.phone ?? <span className="italic text-gray-300">not set</span>}</span>
                </div>
              </div>
            </div>
          )}

          {profile && editMode && (
            <form onSubmit={handleSave} className="space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {saveError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="03001234567"
                  maxLength={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditMode(false); setName(profile.name ?? ''); setPhone(profile.phone ?? '') }}
                  className="text-sm text-gray-500 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {saveSuccess && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg">
              Profile updated
            </div>
          )}
        </div>

        {/* Matches */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Matches</h2>

          {matchesLoading && <p className="text-sm text-gray-400">Loading matches...</p>}

          {!matchesLoading && matches.length === 0 && (
            <p className="text-sm text-gray-400">No matches yet. Post a listing to get started.</p>
          )}

          {matches.length > 0 && (
            /*
              DATA DISPLAYED:
              Each match shows: score, listing ids, status
              Links to both listings
              Dismiss button
            */
            <div className="space-y-3">
              {matches.map(match => (
                <div
                  key={match.id}
                  className="flex items-center justify-between border border-gray-100
                             rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-700 text-xs font-bold
                                    px-2 py-1 rounded-full">
                      {Math.round(match.score * 100)}% match
                    </div>
                    <div className="text-xs text-gray-500">
                      Lost #{match.lost_listing_id} ↔ Found #{match.found_listing_id}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/listings/${match.lost_listing_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Lost item
                    </Link>
                    <Link
                      href={`/listings/${match.found_listing_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Found item
                    </Link>
                    <button
                      onClick={() => handleDismissMatch(match.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">My Listings</h2>
            <Link
              href="/listings/create"
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Post new
            </Link>
          </div>

          {listingsLoading && <p className="text-sm text-gray-400">Loading...</p>}

          {!listingsLoading && listings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No listings yet</p>
              <Link href="/listings/create" className="text-blue-600 text-sm hover:underline">
                Post your first listing
              </Link>
            </div>
          )}

          {listings.length > 0 && (
            <div className="space-y-3">
              {listings.map(listing => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between border border-gray-100
                             rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full
                      ${listing.type === 'lost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {listing.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{listing.title}</p>
                      <p className="text-xs text-gray-400">
                        {listing.category} • {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                      ${listing.status === 'active' ? 'bg-blue-50 text-blue-600'
                        : listing.status === 'resolved' ? 'bg-green-50 text-green-600'
                        : 'bg-gray-50 text-gray-500'}`}
                    >
                      {listing.status}
                    </span>
                    <Link href={`/listings/${listing.id}`} className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}