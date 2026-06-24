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

interface ImagePreview { name: string; url: string }

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
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

      const res = await listingApi.post<{ success: boolean; data: Listing }>('/api/listings', fd)
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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-hi mb-6">Post an item</h1>

        {error && <div className="banner-error mb-5">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type */}
          <div className="card p-5">
            <label className="form-label mb-3">What are you posting?</label>
            <div className="grid grid-cols-2 gap-3">
              {(['lost', 'found'] as ListingType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                    ${type === t
                      ? t === 'lost'
                        ? 'border-red-500/60 bg-red-500/10 text-red-300'
                        : 'border-green-500/60 bg-green-500/10 text-green-300'
                      : 'border-white/8 text-lo hover:border-white/16 hover:text-mid'}`}>
                  {t === 'lost' ? '😔 I lost something' : '😊 I found something'}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="card p-5 space-y-4">
            <p className="section-label">Item details</p>

            <div>
              <label className="form-label">Title <span className="text-danger">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Brown leather wallet" maxLength={120} required
                className="input-field px-3 py-2.5 text-sm" />
              <p className="text-xs text-lo mt-1">{title.length}/120</p>
            </div>

            <div>
              <label className="form-label mb-2">Category <span className="text-danger">*</span></label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-all duration-200
                      ${category === cat ? 'btn-primary border-transparent' : 'btn-ghost'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Description <span className="text-danger">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the item in detail…" required rows={4}
                className="input-field px-3 py-2.5 text-sm resize-none" />
            </div>

            <div>
              <label className="form-label">Date {type === 'lost' ? 'lost' : 'found'} <span className="text-danger">*</span></label>
              <input type="date" value={dateOccurred} onChange={e => setDateOccurred(e.target.value)}
                max={new Date().toISOString().split('T')[0]} required
                className="input-field px-3 py-2.5 text-sm" />
            </div>
          </div>

          {/* Location */}
          <div className="card p-5 space-y-4">
            <p className="section-label">Location</p>
            <p className="text-xs text-lo">Exact coordinates are never shown publicly.</p>

            <div>
              <label className="form-label">Area name <span className="text-danger">*</span></label>
              <input type="text" value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                placeholder="e.g. Lahore Railway Station" maxLength={200} required
                className="input-field px-3 py-2.5 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Latitude <span className="text-danger">*</span></label>
                <input type="number" value={latitude} onChange={e => setLatitude(e.target.value)}
                  placeholder="31.5204" step="any" required
                  className="input-field px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="form-label">Longitude <span className="text-danger">*</span></label>
                <input type="number" value={longitude} onChange={e => setLongitude(e.target.value)}
                  placeholder="74.3587" step="any" required
                  className="input-field px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          {/* Reward */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="reward" checked={rewardOffered}
                onChange={e => setRewardOffered(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="reward" className="text-sm text-mid cursor-pointer">I am offering a reward</label>
            </div>
            {rewardOffered && (
              <input type="text" value={rewardNote} onChange={e => setRewardNote(e.target.value)}
                placeholder="e.g. Will pay Rs 500" maxLength={500}
                className="input-field px-3 py-2.5 text-sm" />
            )}
          </div>

          {/* Photos */}
          <div className="card p-5">
            <p className="section-label mb-3">Photos (optional)</p>
            <p className="text-xs text-lo mb-3">Max 5 photos · 5MB each</p>

            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {imagePreviews.map((p, idx) => (
                  <div key={idx} className="relative group">
                    <img src={p.url} alt={p.name} className="w-20 h-20 object-cover rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 5 && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full py-5 rounded-xl text-sm text-lo hover:text-mid transition-colors duration-200"
                  style={{ border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                  + Add photos ({images.length}/5)
                </button>
              </>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold">
            {loading ? 'Posting…' : `Post ${type} listing`}
          </button>

        </form>
      </div>
    </div>
  )
}
