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

  /*
    DATA SENT:
    GET /listings?type=lost&category=wallet&keyword=brown&page=1&limit=12
    Form: URL query string

    DATA RECEIVED:
    { listings: [...], total, page, totalPages }
  */
  const load = async () => {
    try {
      setLoading(true)
      setError(null)

      const p = new URLSearchParams()
      if (type)       p.append('type',           type)
      if (category && category !== 'all') p.append('category', category)
      if (keyword)    p.append('keyword',        keyword)
      if (rewardOnly) p.append('reward_offered', 'true')
      p.append('page', String(page))
      p.append('limit', '12')

      console.log('[Listings] fetching:', p.toString())

      const res  = await listingApi.get<{ success: boolean; data: ListingsResponse }>(
        `/listings?${p.toString()}`
      )
      const data = res.data.data

      console.log('[Listings] received:', data.total, 'total')
      setListings(data.listings)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (err: any) {
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Browse listings</h1>
            <p className="text-sm text-gray-400 mt-1">{total} listings</p>
          </div>
          <Link
            href="/listings/create"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Post item
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search listings..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Search
          </button>
          {keyword && (
            <button
              type="button"
              onClick={() => { setKeyword(''); setSearchInput(''); setPage(1) }}
              className="text-sm text-gray-500 px-3"
            >
              Clear
            </button>
          )}
        </form>

        {/* Type filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          {['', 'lost', 'found'].map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1) }}
              className={`text-sm px-3 py-1.5 rounded-full border
                ${type === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {t === '' ? 'All' : t === 'lost' ? 'Lost' : 'Found'}
            </button>
          ))}
          <button
            onClick={() => { setRewardOnly(!rewardOnly); setPage(1) }}
            className={`text-sm px-3 py-1.5 rounded-full border
              ${rewardOnly ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            💰 Reward only
          </button>
        </div>

        {/* Category */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat === 'all' ? '' : cat); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize
                ${(category === cat || (cat === 'all' && !category))
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading && <div className="text-center py-12"><p className="text-gray-400 text-sm">Loading...</p></div>}
        {error   && <div className="text-center py-12"><p className="text-red-500 text-sm">{error}</p></div>}

        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No listings found</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  .map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`text-sm w-9 h-9 rounded-lg border
                        ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                    >
                      {p}
                    </button>
                  ))
                }

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}