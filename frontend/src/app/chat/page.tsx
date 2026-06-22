/*
  ============================================================
  CHAT LIST PAGE — /chat
  Shows all conversations for current user

  DATA FLOW: GET /conversations
  ============================================================
*/

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
      .then(res => {
        console.log('[ChatList] conversations:', res.data.data.length)
        setConversations(res.data.data)
      })
      .catch(err => console.error('[ChatList] error:', err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Chats</h1>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && conversations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">No conversations yet</p>
          </div>
        )}

        {conversations.length > 0 && (
          <div className="space-y-2">
            {conversations.map(conv => {
              const isLostUser = user?.userId === conv.lost_user_id
              const myMsgCount  = isLostUser ? conv.lost_msg_count  : conv.found_msg_count
              const remaining   = 30 - myMsgCount

              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4
                             hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${conv.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}
                        >
                          {conv.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          Listing #{conv.listing_id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {remaining} messages remaining
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
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