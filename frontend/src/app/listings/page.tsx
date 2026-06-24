'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link                               from 'next/link'
import { listingApi }                     from '@/utils/axios'
import ListingCard                        from '@/components/ListingCard'
import Navbar                             from '@/components/Navbar'
import type { Listing, ListingsResponse } from '@/types'

const CATEGORIES = [
  'all', 'electronics', 'wallet', 'keys',
  'pets', 'bags', 'documents', 'clothing', 'other'
]

export default function ListingsPage() {
  const [listings,   setListings]   = useState<Listing[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const [type,        setType]        = useState('')
  const [category,    setCategory]    = useState('')
  const [keyword,     setKeyword]     = useState('')
  const [rewardOnly,  setRewardOnly]  = useState(false)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => { load() }, [type, category, keyword, rewardOnly, page])

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const p = new URLSearchParams()
      if (type)       p.append('type',           type)
      if (category && category !== 'all') p.append('category', category)
      if (keyword)    p.append('keyword',        keyword)
      if (rewardOnly) p.append('reward_offered', 'true')
      p.append('page', String(page))
      p.append('limit', '12')

      const res  = await listingApi.get<{ success: boolean; data: ListingsResponse }>(`/api/listings?${p.toString()}`)
      const data = res.data.data
      setListings(data.listings)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch {
      setError('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setKeyword(searchInput)
    setPage(1)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-hi">Browse listings</h1>
            <p className="text-sm text-lo mt-1">{total} listings found</p>
          </div>
          <Link href="/listings/create" className="btn-primary text-sm px-5 py-2 rounded-lg text-center">
            Post item
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-5 flex gap-2">
          <input
            type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search listings…"
            className="input-field flex-1 px-4 py-2.5 text-sm"
          />
          <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm shrink-0">
            Search
          </button>
          {keyword && (
            <button type="button"
              onClick={() => { setKeyword(''); setSearchInput(''); setPage(1) }}
              className="btn-ghost px-3 py-2 rounded-lg text-sm shrink-0">
              ✕
            </button>
          )}
        </form>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[['', 'All'], ['lost', 'Lost'], ['found', 'Found']].map(([val, label]) => (
            <button key={val}
              onClick={() => { setType(val); setPage(1) }}
              className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-200
                ${type === val
                  ? 'btn-primary border-transparent'
                  : 'btn-ghost'}`}>
              {label}
            </button>
          ))}
          <button
            onClick={() => { setRewardOnly(!rewardOnly); setPage(1) }}
            className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-200
              ${rewardOnly ? 'badge-reward border-yellow-500/30' : 'btn-ghost'}`}>
            🏆 Reward only
          </button>
        </div>

        {/* Category */}
        <div className="flex flex-wrap gap-1.5 mb-7">
          {CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => { setCategory(cat === 'all' ? '' : cat); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-all duration-200
                ${(category === cat || (cat === 'all' && !category))
                  ? 'bg-white/10 border-white/20 text-hi'
                  : 'btn-ghost text-lo'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-44" />
            ))}
          </div>
        )}
        {error && <div className="banner-error text-center py-4">{error}</div>}

        {!loading && !error && listings.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-mid text-sm">No listings found</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-ghost text-sm px-4 py-2 rounded-lg disabled:opacity-30">
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`text-sm w-9 h-9 rounded-lg border transition-all duration-200
                        ${page === p ? 'btn-primary border-transparent' : 'btn-ghost'}`}>
                      {p}
                    </button>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-ghost text-sm px-4 py-2 rounded-lg disabled:opacity-30">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
