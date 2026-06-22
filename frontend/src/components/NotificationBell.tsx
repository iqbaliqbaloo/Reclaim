/*
  ============================================================
  NOTIFICATION BELL — dropdown in navbar

  DATA FLOW:
  GET /notifications     → load list
  PUT /notifications/:id/read → mark single read
  PUT /notifications/read-all → mark all read

  Polls every 30 seconds for new notifications
  ============================================================
*/

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
    const interval = setInterval(load, 30000)  // poll every 30s
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
      console.log('[NotificationBell] loaded:', res.data.data.length)
      setNotifications(res.data.data)
    } catch (err: any) {
      console.error('[NotificationBell] error:', err.message)
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
        className="relative text-gray-500 hover:text-gray-700 p-1"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white
                           text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200
                        rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No notifications</p>
          )}

          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`block w-full text-left p-3 border-b border-gray-50
                         hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
            >
              <p className="text-sm font-medium text-gray-800">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}