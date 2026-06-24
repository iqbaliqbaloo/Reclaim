import Link from 'next/link'
import type { Listing } from '@/types'

interface Props {
  listing: Listing
}

export default function ListingCard({ listing }: Props) {
  const typeBadge   = listing.type === 'lost' ? 'badge-lost' : 'badge-found'
  const statusBadge = `badge-${listing.status}`

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card card-hover block p-4 group"
    >
      {/* Image placeholder strip if no images */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`badge ${typeBadge}`}>
          {listing.type === 'lost' ? 'Lost' : 'Found'}
        </span>
        <span className={`badge ${statusBadge}`}>
          {listing.status}
        </span>
        {listing.reward_offered && (
          <span className="badge badge-reward">Reward</span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-hi mb-1.5 line-clamp-1 group-hover:text-accent transition-colors duration-200">
        {listing.title}
      </h3>
      <p className="text-xs text-lo line-clamp-2 mb-4 leading-relaxed">
        {listing.description}
      </p>

      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-xs text-mid flex items-center gap-1">
            <span>📍</span>
            <span className="truncate max-w-[140px]">{listing.location_label}</span>
          </p>
          <p className="text-xs text-lo">
            {new Date(listing.date_occurred).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className="text-xs text-lo capitalize px-2 py-1 rounded-md"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {listing.category}
        </span>
      </div>
    </Link>
  )
}
