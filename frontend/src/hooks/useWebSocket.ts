/*
  ============================================================
  USE WEBSOCKET HOOK

  Connects to chat-service WebSocket
  Handles incoming messages, typing indicators
  Auto-reconnects on disconnect

  USAGE:
  const { sendMessage, sendTyping, isConnected } = useWebSocket(onMessage, onTyping)
  ============================================================
*/

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getAccessToken } from '@/utils/axios'

interface WSMessage {
  type: string
  data: any
}

export function useWebSocket(
  onNewMessage: (data: any) => void,
  onTyping:     (data: any) => void
) {
  const wsRef           = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      console.log('[useWebSocket] no token — skipping connection')
      return
    }

    const wsUrl = (process.env.NEXT_PUBLIC_CHAT_URL || 'http://localhost:4007')
      .replace('http', 'ws')

    console.log('[useWebSocket] connecting to:', wsUrl)

    const ws = new WebSocket(`${wsUrl}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[useWebSocket] connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        console.log('[useWebSocket] received:', msg.type)

        if (msg.type === 'new_message') {
          onNewMessage(msg.data)
        }
        if (msg.type === 'typing') {
          onTyping(msg.data)
        }
      } catch (err) {
        console.error('[useWebSocket] parse error:', err)
      }
    }

    ws.onclose = () => {
      console.log('[useWebSocket] disconnected')
      setIsConnected(false)
    }

    ws.onerror = (err) => {
      console.error('[useWebSocket] error:', err)
    }

    return () => {
      console.log('[useWebSocket] cleaning up connection')
      ws.close()
    }
  }, [])

  const sendMessage = useCallback((conversationId: number, body: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] sending message:', conversationId)
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversationId,
        body
      }))
    } else {
      console.log('[useWebSocket] not connected — message not sent via WS')
    }
  }, [])

  const sendTyping = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', conversationId }))
    }
  }, [])

  return { sendMessage, sendTyping, isConnected }
}