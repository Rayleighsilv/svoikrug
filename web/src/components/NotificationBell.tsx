'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type NotificationItem = {
  id: string
  type: string
  payload: { eventId: string; title: string; hostName: string }
  isRead: boolean
  createdAt: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин назад`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ч назад`
  return d.toLocaleDateString('ru-RU')
}

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCount = async () => {
    try {
      const d = await api.get<{ success: boolean; count: number }>('/notifications/unread-count')
      setUnreadCount(d.count)
    } catch {
      // игнорируем
    }
  }

  // Обновляем бейдж при появлении пользователя и раз в 30с.
  useEffect(() => {
    if (!user) return
    refreshCount()
    const t = setInterval(refreshCount, 30000)
    return () => clearInterval(t)
  }, [user])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const d = await api.get<{ success: boolean; notifications: NotificationItem[] }>('/notifications')
      setNotifications(d.notifications || [])
    } catch {
      // игнорируем
    } finally {
      setLoading(false)
    }
  }

  // Закрываем панель при клике вне.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadNotifications()
  }

  const handleClick = async (n: NotificationItem) => {
    setOpen(false)
    router.push(`/events/${n.payload.eventId}`)
    if (!n.isRead) {
      try {
        await api.post(`/notifications/${n.id}/read`)
        await refreshCount()
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      } catch {
        // игнорируем
      }
    }
  }

  const handleMarkAll = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })))
    } catch {
      // игнорируем
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded hover:bg-gray-100"
        aria-label="Уведомления"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-semibold text-sm">Уведомления</h3>
            <button onClick={handleMarkAll} className="text-xs text-blue-600 hover:underline">
              Отметить все
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">Загрузка...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Уведомлений нет</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 ${
                        n.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'
                      }`}
                    >
                      <span className="block">
                        <strong>{n.payload.hostName}</strong> создал(а) сбор «{n.payload.title}»
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
