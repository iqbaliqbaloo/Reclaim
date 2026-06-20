import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">

        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Lost something? Found something?
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Reclaim connects people who lost items with people who found them.
          AI matching helps reunite items with their owners.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/listings/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl
                       text-sm font-medium hover:bg-blue-700"
          >
            Post an item
          </Link>
          <Link
            href="/listings"
            className="border border-gray-300 text-gray-600 px-6 py-3
                       rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Browse listings
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-16 text-left">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-3">📝</div>
            <h3 className="font-semibold text-gray-800 mb-1">Post your item</h3>
            <p className="text-sm text-gray-500">
              Describe what you lost or found with photos and location
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800 mb-1">AI matching</h3>
            <p className="text-sm text-gray-500">
              Our algorithm automatically finds possible matches
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-3">🤝</div>
            <h3 className="font-semibold text-gray-800 mb-1">Connect safely</h3>
            <p className="text-sm text-gray-500">
              Chat privately after claim verification — no personal info shared
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}