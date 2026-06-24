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

  const bottomRef = useRef<HTMLDivElement>(null)

  const handleNewMessage = (data: { message: Message }) => {
    setMessages(prev => [...prev, data.message])
  }
  const handleTyping = () => {
    setOtherTyping(true)
    setTimeout(() => setOtherTyping(false), 2000)
  }

  const { sendTyping, isConnected } = useWebSocket(handleNewMessage, handleTyping)

  useEffect(() => {
    if (!params.id) return
    loadMessages()
  }, [params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    try {
      const res = await chatApi.get<{ success: boolean; data: { conversation: Conversation; messages: Message[] } }>(
        `/conversations/${params.id}/messages`
      )
      setConversation(res.data.data.conversation)
      setMessages(res.data.data.messages)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true); setError(null)
    try {
      const res = await chatApi.post<{ success: boolean; data: { message: Message; remaining: number } }>(
        `/conversations/${params.id}/messages`,
        { body }
      )
      setMessages(prev => [...prev, res.data.data.message])
      setBody('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleConfirmReturn = async () => {
    if (!window.confirm('Confirm that the item was returned successfully?')) return
    try {
      const res = await chatApi.put(`/conversations/${params.id}/confirm`)
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

  const handleDispute = async () => {
    if (!window.confirm('Dispute this resolution? An admin will review this conversation.')) return
    try {
      await chatApi.put(`/conversations/${params.id}/dispute`)
      alert('Dispute raised. An admin will review.')
      loadMessages()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Dispute failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-80 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    )
  }

  if (error && !conversation) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center py-16">
          <p className="text-danger text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const isLostUser = user?._id === conversation?.lost_user_id
  const myMsgCount = isLostUser ? conversation?.lost_msg_count ?? 0 : conversation?.found_msg_count ?? 0
  const remaining  = 30 - myMsgCount
  const isClosed   = conversation?.status === 'closed'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 py-5 gap-3">

        {/* Header */}
        <div className="card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-hi">
                Listing #{conversation?.listing_id}
              </p>
              <p className="text-xs text-lo mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {isConnected ? 'Live' : 'Reconnecting…'} · {remaining} messages left
              </p>
            </div>
            {!isClosed && (
              <div className="flex gap-2">
                <button onClick={handleConfirmReturn}
                  className="btn-success text-xs px-3 py-1.5 rounded-lg">
                  ✓ Confirm return
                </button>
                <button onClick={handleDispute}
                  className="btn-danger text-xs px-3 py-1.5 rounded-lg">
                  Dispute
                </button>
              </div>
            )}
          </div>

          {isClosed && (
            <div className="banner-info mt-3 text-xs">
              Conversation closed · resolution: {conversation?.resolution_status}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="card flex-1 p-4 overflow-y-auto min-h-70 max-h-120">
          {messages.length === 0 && (
            <p className="text-center text-lo text-sm py-10">No messages yet. Say hello! 👋</p>
          )}

          <div className="space-y-3">
            {messages.map(msg => {
              const isMine = msg.sender_id === user?._id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs sm:max-w-sm px-4 py-2.5 text-sm ${isMine ? 'bubble-mine' : 'bubble-other'}`}>
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1.5 ${isMine ? 'text-blue-200' : 'text-lo'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            {otherTyping && (
              <div className="flex justify-start">
                <div className="bubble-other px-4 py-2.5 text-xs text-lo italic">typing…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {error && <div className="banner-error text-sm">{error}</div>}

        {/* Input */}
        {!isClosed && remaining > 0 ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={e => { setBody(e.target.value); sendTyping(Number(params.id)) }}
              placeholder="Type a message…"
              maxLength={2000}
              className="input-field flex-1 px-4 py-2.5 text-sm"
            />
            <button type="submit" disabled={sending || !body.trim()}
              className="btn-primary px-5 py-2 rounded-lg text-sm shrink-0">
              {sending ? '…' : 'Send'}
            </button>
          </form>
        ) : (
          <div className="detail-box text-center">
            <p className="text-xs text-lo">
              {isClosed ? 'This conversation is closed.' : 'Message limit reached.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
