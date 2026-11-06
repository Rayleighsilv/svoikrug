'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useNotifications } from '@/lib/useNotifications'
import NotificationsList from '@/components/NotificationsList'

export default function NotificationBell() {
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const {
    notifications,
    loading,
    error,
    reviewError,
    reviewingId,
    load,
    markRead,
    markAllRead,
    review,
  } = useNotifications({ limit: 50 })

  const refreshCount = async () => {
    try {
      const data = await api.get<{ success: boolean; count: number }>(
        '/notifications/unread-count',
      )
      setUnreadCount(data.count)
    } catch {
      // игнорируем
    }
  }

  // Обновляем бейдж при появлении пользователя, раз в 30с и после действий
  // на странице уведомлений.
  useEffect(() => {
    if (!user) return
    void refreshCount()
    const timer = setInterval(refreshCount, 30000)
    const handler = () => void refreshCount()
    window.addEventListener('sk:notifications-updated', handler)
    return () => {
      clearInterval(timer)
      window.removeEventListener('sk:notifications-updated', handler)
    }
  }, [user])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      void load()
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : 'Уведомления'}
        aria-expanded={open}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 min-w-[18px] -translate-y-1/2 translate-x-1/2 rounded-full bg-red-600 px-1.5 text-center text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <h3 className="text-sm font-semibold">Уведомления</h3>
            <button
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              Отметить все
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            <NotificationsList
              notifications={notifications}
              loading={loading}
              error={error}
              reviewError={reviewError}
              reviewingId={reviewingId}
              compact
              onRetry={load}
              onReview={review}
              onMarkRead={markRead}
              onOpen={() => setOpen(false)}
            />
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-200 px-4 py-2.5 text-center text-xs font-medium text-blue-600 transition hover:bg-gray-50"
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  )
}
