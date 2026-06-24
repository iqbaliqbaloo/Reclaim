'use client'

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { chatApi }             from '@/utils/axios'
import { useAuth }             from '@/store/authStore'
import Navbar                  from '@/components/Navbar'
import type { Conversation }   from '@/types'

export default function ChatListPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    chatApi.get<{ success: boolean; data: Conversation[] }>('/conversations')
      .then(res => setConversations(res.data.data))
      .catch(err => console.error('[ChatList] error:', err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-hi mb-6">Chats</h1>

        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20" />)}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-mid text-sm">No conversations yet</p>
            <p className="text-lo text-xs mt-2">Conversations open after a claim is approved.</p>
          </div>
        )}

        {conversations.length > 0 && (
          <div className="space-y-2">
            {conversations.map(conv => {
              const isLostUser = user?._id === conv.lost_user_id
              const myMsgCount = isLostUser ? conv.lost_msg_count : conv.found_msg_count
              const remaining  = 30 - myMsgCount

              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="card card-hover flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      💬
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`badge ${conv.status === 'active' ? 'badge-active' : 'badge-removed'}`}>
                          {conv.status}
                        </span>
                        <span className="text-xs text-lo">Listing #{conv.listing_id}</span>
                      </div>
                      <p className="text-xs text-lo">{remaining} messages remaining</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-lo">{new Date(conv.updated_at).toLocaleDateString()}</p>
                    <p className="text-accent text-xs mt-1">Open →</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
