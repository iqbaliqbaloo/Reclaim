'use client'

import { useState, useEffect, useRef } from 'react'
import { notificationApi }              from '@/utils/axios'
import type { Notification }            from '@/types'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen,        setIsOpen]        = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const load = async () => {
    try {
      const res = await notificationApi.get<{ success: boolean; data: Notification[] }>('/notifications')
      setNotifications(res.data.data)
    } catch {
      // silently fail — user may not be authenticated yet
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await notificationApi.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err: any) {
      console.error('[NotificationBell] mark read error:', err.message)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err: any) {
      console.error('[NotificationBell] mark all read error:', err.message)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-mid hover:text-hi transition-colors duration-200 rounded-lg hover:bg-white/5"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white
                           text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center
                           shadow-lg animate-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 card overflow-hidden z-50 animate-fade-up"
          style={{ maxHeight: '400px' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b divider">
            <p className="text-sm font-semibold text-hi">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-accent hover:opacity-70 transition-opacity"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            {notifications.length === 0 && (
              <p className="text-center text-lo text-sm py-10">No notifications</p>
            )}

            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`block w-full text-left px-4 py-3 border-b divider transition-all duration-150
                           hover:bg-white/[0.03] ${!n.is_read ? 'bg-blue-500/[0.06]' : ''}`}
              >
                {!n.is_read && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 mb-0.5 align-middle" />
                )}
                <p className="text-sm font-medium text-hi">{n.title}</p>
                <p className="text-xs text-mid mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-xs text-lo mt-1">
                  {new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
