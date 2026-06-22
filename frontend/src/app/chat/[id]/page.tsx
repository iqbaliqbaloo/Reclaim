/*
  ============================================================
  CHAT WINDOW — /chat/[id]
  Real-time messaging with WebSocket + REST fallback

  DATA FLOW:
  GET  /conversations/:id/messages → load history
  POST /conversations/:id/messages → send (REST, also via WS)
  PUT  /conversations/:id/confirm  → confirm return
  PUT  /conversations/:id/dispute  → dispute resolution

  WebSocket handles real-time delivery
  REST handles initial load and fallback
  ============================================================
*/

'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useParams }                              from 'next/navigation'
import { chatApi }                                from '@/utils/axios'
import { useAuth }                                from '@/store/authStore'
import { useWebSocket }                           from '@/hooks/useWebSocket'
import Navbar                                     from '@/components/Navbar'
import type { Conversation, Message }             from '@/types'

export default function ChatWindowPage() {
  const params   = useParams<{ id: string }>()
  const { user } = useAuth()

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages,     setMessages]     = useState<Message[]>([])
  const [loading,      setLoading]      = useState(true)
  const [body,         setBody]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [otherTyping,  setOtherTyping]  = useState(false)

  const bottomRef     = useRef<HTMLDivElement>(null)
  const typingTimeout  = useRef<NodeJS.Timeout | null>(null)

  /*
    WebSocket callback — new message received from other user
  */
  const handleNewMessage = (data: { message: Message }) => {
    console.log('[ChatWindow] new message via WS:', data.message.id)
    setMessages(prev => [...prev, data.message])
  }

  const handleTyping = () => {
    setOtherTyping(true)
    setTimeout(() => setOtherTyping(false), 2000)
  }

  const { sendMessage: wsSendMessage, sendTyping, isConnected } = useWebSocket(
    handleNewMessage,
    handleTyping
  )

  useEffect(() => {
    if (!params.id) return
    loadMessages()
  }, [params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /*
    DATA SENT: GET /conversations/:id/messages
    DATA RECEIVED: { conversation, messages }
  */
  const loadMessages = async () => {
    try {
      console.log('[ChatWindow] loading messages for:', params.id)
      const res = await chatApi.get<{ success: boolean; data: { conversation: Conversation; messages: Message[] } }>(
        `/conversations/${params.id}/messages`
      )
      console.log('[ChatWindow] loaded:', res.data.data.messages.length, 'messages')
      setConversation(res.data.data.conversation)
      setMessages(res.data.data.messages)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  /*
    DATA SENT:
    POST /conversations/:id/messages
    Body: { body }
    Also broadcast via WebSocket for real-time delivery
  */
  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim() || sending) return

    setSending(true)
    setError(null)

    console.log('[ChatWindow] sending message:', body.substring(0, 30))

    try {
      const res = await chatApi.post<{ success: boolean; data: { message: Message; remaining: number } }>(
        `/conversations/${params.id}/messages`,
        { body }
      )

      console.log('[ChatWindow] sent, remaining:', res.data.data.remaining)
      setMessages(prev => [...prev, res.data.data.message])
      setBody('')

      // also notify via WebSocket for instant delivery to other user
      wsSendMessage(Number(params.id), body)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleTypingInput = () => {
    sendTyping(Number(params.id))
  }

  /*
    DATA SENT: PUT /conversations/:id/confirm
  */
  const handleConfirmReturn = async () => {
    if (!window.confirm('Confirm that the item was returned successfully?')) return

    try {
      console.log('[ChatWindow] confirming return')
      const res = await chatApi.put(`/conversations/${params.id}/confirm`)
      console.log('[ChatWindow] confirm result:', res.data.data)

      if (res.data.data.bothConfirmed) {
        alert('Both parties confirmed! This listing is now resolved.')
      } else {
        alert('Your confirmation was recorded. Waiting for the other party.')
      }
      loadMessages()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Confirmation failed')
    }
  }

  /*
    DATA SENT: PUT /conversations/:id/dispute
  */
  const handleDispute = async () => {
    if (!window.confirm('Dispute this resolution? This will be reviewed by an admin.')) return

    try {
      await chatApi.put(`/conversations/${params.id}/dispute`)
      alert('Dispute raised. An admin will review this conversation.')
      loadMessages()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Dispute failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <p className="text-center text-gray-400 text-sm py-12">Loading chat...</p>
      </div>
    )
  }

  if (error && !conversation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <p className="text-center text-red-500 text-sm py-12">{error}</p>
      </div>
    )
  }

  const isLostUser  = user?.userId === conversation?.lost_user_id
  const myMsgCount  = isLostUser ? conversation?.lost_msg_count  ?? 0 : conversation?.found_msg_count ?? 0
  const remaining   = 30 - myMsgCount
  const isClosed    = conversation?.status === 'closed'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 py-6">

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Conversation about listing #{conversation?.listing_id}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isConnected ? '🟢 Connected' : '🔴 Reconnecting...'} · {remaining} messages remaining
              </p>
            </div>

            {!isClosed && (
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmReturn}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                >
                  Confirm return
                </button>
              </div>
            )}
          </div>

          {isClosed && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-700">
                ✅ This conversation is closed — resolution: {conversation?.resolution_status}
              </p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4
                        overflow-y-auto mb-4 min-h-[400px] max-h-[500px]">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              No messages yet. Say hello!
            </p>
          )}

          <div className="space-y-3">
            {messages.map(msg => {
              const isMine = msg.sender_id === user?.userId
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm
                      ${isMine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            {otherTyping && (
              <p className="text-xs text-gray-400 italic">Typing...</p>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        {/* Input */}
        {!isClosed && remaining > 0 ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => { setBody(e.target.value); handleTypingInput() }}
              placeholder="Type a message..."
              maxLength={2000}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm
                         font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        ) : (
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">
              {isClosed ? 'This conversation is closed.' : 'You have reached the message limit.'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}