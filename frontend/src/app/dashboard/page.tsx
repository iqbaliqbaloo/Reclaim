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
  const [matches,         setMatches]         = useState<Match[]>([])
  const [matchesLoading,  setMatchesLoading]  = useState(true)

  useEffect(() => {
    loadProfile()
    loadMyListings()
    loadMyMatches()
  }, [])

  const loadProfile = async () => {
    try {
      const res  = await userApi.get<{ success: boolean; data: UserProfile }>('/api/users/me')
      const data = res.data.data
      setProfile(data)
      setName(data.name  ?? '')
      setPhone(data.phone ?? '')
    } catch {
      setProfileError('Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const loadMyListings = async () => {
    try {
      const res = await listingApi.get<{ success: boolean; data: Listing[] }>('/api/listings/my')
      setListings(res.data.data)
    } catch {
    } finally {
      setListingsLoading(false)
    }
  }

  const loadMyMatches = async () => {
    try {
      const res = await matchApi.get<{ success: boolean; data: Match[] }>('/matches/my')
      setMatches(res.data.data)
    } catch {
    } finally {
      setMatchesLoading(false)
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await userApi.put<{ success: boolean; data: UserProfile }>(
        '/api/users/me', { name, phone }
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

  const handleDismissMatch = async (matchId: number) => {
    try {
      await matchApi.put(`/matches/${matchId}/dismiss`)
      setMatches(prev => prev.filter(m => m.id !== matchId))
    } catch (err: any) {
      console.error('[Dashboard] dismiss error:', err.message)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        <h1 className="text-2xl font-bold text-hi">Dashboard</h1>

        {/* Profile card */}
        <div className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-hi">My Profile</h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)}
                className="text-sm text-accent hover:opacity-70 transition-opacity">
                Edit
              </button>
            )}
          </div>

          {profileLoading && <div className="skeleton h-20 w-full" />}
          {profileError   && <p className="text-sm text-danger">{profileError}</p>}

          {profile && !editMode && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="stat-card">
                  <div className="stat-number">{profile.reputation}</div>
                  <div className="text-xs text-lo mt-1">Reputation</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{5 - profile.daily_post_count}</div>
                  <div className="text-xs text-lo mt-1">Posts left today</div>
                </div>
                <div className="stat-card col-span-2 sm:col-span-1">
                  <div className="stat-number text-2xl capitalize">{profile.role}</div>
                  <div className="text-xs text-lo mt-1">Role</div>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Email', value: profile.email },
                  { label: 'Name',  value: profile.name  ?? '—' },
                  { label: 'Phone', value: profile.phone ?? '—' }
                ].map(row => (
                  <div key={row.label} className="flex gap-3">
                    <span className="text-lo w-16 shrink-0">{row.label}</span>
                    <span className="text-mid break-all">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile && editMode && (
            <form onSubmit={handleSave} className="space-y-4">
              {saveError && <div className="banner-error">{saveError}</div>}
              <div>
                <label className="form-label">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" maxLength={100}
                  className="input-field px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="03001234567" maxLength={20}
                  className="input-field px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="btn-primary px-5 py-2 rounded-lg text-sm">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button"
                  onClick={() => { setEditMode(false); setName(profile.name ?? ''); setPhone(profile.phone ?? '') }}
                  className="btn-ghost px-5 py-2 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {saveSuccess && <div className="banner-success mt-4">Profile updated successfully.</div>}
        </div>

        {/* Matches card */}
        <div className="card p-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <h2 className="font-semibold text-hi mb-4">My Matches</h2>

          {matchesLoading && <div className="skeleton h-16 w-full" />}

          {!matchesLoading && matches.length === 0 && (
            <p className="text-sm text-lo">No matches yet. Post a listing to get started.</p>
          )}

          {matches.length > 0 && (
            <div className="space-y-2">
              {matches.map(match => (
                <div key={match.id}
                  className="detail-box flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all duration-200 hover:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="badge badge-match">{Math.round(match.score * 100)}% match</span>
                    <span className="text-xs text-lo">
                      Lost #{match.lost_listing_id} ↔ Found #{match.found_listing_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/listings/${match.lost_listing_id}`} className="text-xs text-accent hover:opacity-70 transition-opacity">Lost item</Link>
                    <Link href={`/listings/${match.found_listing_id}`} className="text-xs text-accent hover:opacity-70 transition-opacity">Found item</Link>
                    <button onClick={() => handleDismissMatch(match.id)} className="text-xs text-lo hover:text-danger transition-colors">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listings card */}
        <div className="card p-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-hi">My Listings</h2>
            <Link href="/listings/create" className="btn-primary text-xs px-4 py-1.5 rounded-lg">
              Post new
            </Link>
          </div>

          {listingsLoading && <div className="skeleton h-20 w-full" />}

          {!listingsLoading && listings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lo text-sm mb-3">No listings yet</p>
              <Link href="/listings/create" className="text-accent text-sm hover:opacity-70 transition-opacity">
                Post your first listing
              </Link>
            </div>
          )}

          {listings.length > 0 && (
            <div className="space-y-2">
              {listings.map(listing => (
                <div key={listing.id}
                  className="detail-box flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${listing.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {listing.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-hi">{listing.title}</p>
                      <p className="text-xs text-lo">
                        {listing.category} · {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-${listing.status}`}>{listing.status}</span>
                    <Link href={`/listings/${listing.id}`} className="text-xs text-accent hover:opacity-70 transition-opacity">
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
