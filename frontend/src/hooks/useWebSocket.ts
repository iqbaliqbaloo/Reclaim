'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getAccessToken, doRefresh } from '@/utils/axios'

interface WSMessage {
  type: string
  data: any
}

const BASE_URL = (process.env.NEXT_PUBLIC_CHAT_URL || 'http://localhost:4007')
  .replace(/^http/, 'ws')

export function useWebSocket(
  onNewMessage: (data: any) => void,
  onTyping:     (data: any) => void
) {
  const wsRef         = useRef<WebSocket | null>(null)
  const retryRef      = useRef(0)
  const destroyedRef  = useRef(false)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(async () => {
    if (destroyedRef.current) return

    let token = getAccessToken()
    if (!token) {
      try { token = await doRefresh() } catch { return }
    }

    const ws = new WebSocket(`${BASE_URL}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      retryRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (msg.type === 'new_message') onNewMessage(msg.data)
        if (msg.type === 'typing')      onTyping(msg.data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (destroyedRef.current) return
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
      retryRef.current += 1
      setTimeout(connect, delay)
    }

    // onerror always fires before onclose — just let onclose handle the retry
    ws.onerror = () => {}

  }, [onNewMessage, onTyping])

  useEffect(() => {
    destroyedRef.current = false
    connect()
    return () => {
      destroyedRef.current = true
      wsRef.current?.close()
    }
  }, [])

  const sendMessage = useCallback((conversationId: number, body: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', conversationId, body }))
    }
  }, [])

  const sendTyping = useCallback((conversationId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', conversationId }))
    }
  }, [])

  return { sendMessage, sendTyping, isConnected }
}
