'use client'

import { useState, useRef, FormEvent, ChangeEvent } from 'react'
import { useRouter }                                 from 'next/navigation'
import { listingApi }                                from '@/utils/axios'
import Navbar                                        from '@/components/Navbar'
import type { ListingType, ListingCategory, Listing } from '@/types'

const CATEGORIES: ListingCategory[] = [
  'electronics', 'wallet', 'keys', 'pets',
  'bags', 'documents', 'clothing', 'other'
]

interface ImagePreview {
  name: string
  url:  string
}

export default function CreateListingPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [type,          setType]          = useState<ListingType>('lost')
  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [category,      setCategory]      = useState<ListingCategory>('other')
  const [dateOccurred,  setDateOccurred]  = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [latitude,      setLatitude]      = useState('')
  const [longitude,     setLongitude]     = useState('')
  const [rewardOffered, setRewardOffered] = useState(false)
  const [rewardNote,    setRewardNote]    = useState('')
  const [images,        setImages]        = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files    = Array.from(e.target.files ?? [])
    const combined = [...images, ...files].slice(0, 5)
    const valid    = combined.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)

    setImages(valid)
    valid.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setImagePreviews(prev =>
          prev.find(p => p.name === file.name) ? prev :
          [...prev, { name: file.name, url: ev.target?.result as string }]
        )
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  /*
    DATA SENT:
    POST /listings
    FORM: multipart/form-data
    Fields: type, title, description, category, date_occurred,
            location_label, latitude, longitude, reward_offered,
            reward_note, images (files)

    DATA RECEIVED:
    { success: true, data: { id, ... } }
  */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('[CreateListing] submitting...')

    try {
      const fd = new FormData()
      fd.append('type',           type)
      fd.append('title',          title)
      fd.append('description',    description)
      fd.append('category',       category)
      fd.append('date_occurred',  dateOccurred)
      fd.append('location_label', locationLabel)
      fd.append('latitude',       latitude)
      fd.append('longitude',      longitude)
      fd.append('reward_offered', String(rewardOffered))
      fd.append('reward_note',    rewardNote)
      images.forEach(f => fd.append('images', f))

      const res = await listingApi.post<{ success: boolean; data: Listing }>(
        '/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      console.log('[CreateListing] created:', res.data.data.id)
      router.push(`/listings/${res.data.data.id}`)
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Failed to create listing'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Post an item</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Type */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">What are you posting?</label>
            <div className="flex gap-3">
              {(['lost', 'found'] as ListingType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium border-2
                    ${type === t
                      ? t === 'lost' ? 'border-red-500 bg-red-50 text-red-600'
                                     : 'border-green-500 bg-green-50 text-green-600'
                      : 'border-gray-200 text-gray-500'}`}
                >
                  {t === 'lost' ? '😢 I lost something' : '🎉 I found something'}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Item details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Brown leather wallet" maxLength={120} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/120</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize
                      ${category === cat ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the item in detail..." required rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date {type === 'lost' ? 'lost' : 'found'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date" value={dateOccurred} onChange={e => setDateOccurred(e.target.value)}
                max={new Date().toISOString().split('T')[0]} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Location</h2>
            <p className="text-xs text-gray-400">Exact coordinates never shown publicly — only area name.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                placeholder="e.g. Lahore Railway Station" maxLength={200} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" value={latitude} onChange={e => setLatitude(e.target.value)}
                  placeholder="31.5204" step="any" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" value={longitude} onChange={e => setLongitude(e.target.value)}
                  placeholder="74.3587" step="any" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Find coordinates at{' '}
              <a href="https://www.latlong.net" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                latlong.net
              </a>
            </p>
          </div>

          {/* Reward */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="reward" checked={rewardOffered}
                     onChange={e => setRewardOffered(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="reward" className="text-sm font-medium text-gray-700">
                I am offering a reward
              </label>
            </div>
            {rewardOffered && (
              <input
                type="text" value={rewardNote} onChange={e => setRewardNote(e.target.value)}
                placeholder="e.g. Will pay Rs 500" maxLength={500}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Photos */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Photos</h2>
            <p className="text-xs text-gray-400 mb-3">Max 5 photos, 5MB each.</p>

            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {imagePreviews.map((p, idx) => (
                  <div key={idx} className="relative">
                    <img src={p.url} alt={p.name} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button" onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 5 && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                <button
                  type="button" onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-4
                             text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 w-full"
                >
                  📷 Add photos ({images.length}/5)
                </button>
              </>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm
                       font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Posting...' : `Post ${type} listing`}
          </button>

        </form>
      </div>
    </div>
  )
}