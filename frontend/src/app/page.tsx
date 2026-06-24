import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 sm:pt-32 sm:pb-24 text-center">

        {/* Glow orb */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-start justify-center pointer-events-none"
          style={{ top: '-60px' }}
        >
          <div style={{
            width: '600px', height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)'
          }} />
        </div>

        <div className="relative animate-fade-up">
          <span className="badge badge-active mb-6 inline-flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-powered matching
          </span>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            <span className="gradient-text">Lost something?</span>
            <br />
            <span className="text-hi">We&apos;ll help you</span>{' '}
            <span className="gradient-text">find it.</span>
          </h1>

          <p className="text-base sm:text-lg text-mid mb-10 max-w-xl mx-auto leading-relaxed">
            Reclaim connects people who lost items with people who found them.
            Smart AI matching reunites belongings with their owners — safely and privately.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/listings/create"
              className="btn-primary w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold"
            >
              Post an item
            </Link>
            <Link
              href="/listings"
              className="btn-ghost w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '📝',
              title: 'Post your item',
              desc: 'Describe what you lost or found with photos and location details.',
              gradient: 'rgba(59,130,246,0.08)'
            },
            {
              icon: '🤖',
              title: 'AI matching',
              desc: 'Our algorithm automatically finds possible matches using semantic analysis.',
              gradient: 'rgba(99,102,241,0.08)'
            },
            {
              icon: '🤝',
              title: 'Connect safely',
              desc: 'Chat privately after claim verification — no personal info shared.',
              gradient: 'rgba(6,182,212,0.08)'
            }
          ].map((feat, i) => (
            <div
              key={i}
              className="card card-hover p-6"
              style={{ background: `linear-gradient(135deg, ${feat.gradient}, rgba(255,255,255,0.02))` }}
            >
              <div className="text-3xl mb-4">{feat.icon}</div>
              <h3 className="font-semibold text-hi mb-2">{feat.title}</h3>
              <p className="text-sm text-mid leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { value: '100%', label: 'Private' },
            { value: 'AI', label: 'Smart matching' },
            { value: '0₨', label: 'Free to use' }
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold gradient-text">{s.value}</div>
              <div className="text-xs text-lo mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
