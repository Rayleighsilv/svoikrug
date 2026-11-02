'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'

type NotificationPayload = {
  eventId: string
  title?: string
  hostName?: string
  eventTitle?: string
  guestId?: string
  guestNickname?: string
  guestAvatarUrl?: string | null
  decision?: 'approved' | 'rejected'
}

type NotificationItem = {
  id: string
  type: string
  payload: NotificationPayload
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
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState('')

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
    if (next) {
      setReviewError('')
      loadNotifications()
    }
  }

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`)
      await refreshCount()
      setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)))
    } catch {
      // игнорируем
    }
  }

  const handleClick = async (n: NotificationItem) => {
    setOpen(false)
    router.push(`/events/${n.payload.eventId}`)
    if (!n.isRead) await markRead(n.id)
  }

  const handleOpen = (n: NotificationItem) => {
    setOpen(false)
    if (!n.isRead) void markRead(n.id)
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

  const handleReview = async (n: NotificationItem, action: 'approve' | 'reject') => {
    const guestId = n.payload.guestId
    if (!guestId) return

    setReviewingId(n.id)
    setReviewError('')
    try {
      await api.post(`/events/${n.payload.eventId}/guests/${guestId}/${action}`)
      const decision = action === 'approve' ? 'approved' : 'rejected'
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id
            ? { ...item, isRead: true, payload: { ...item.payload, decision } }
            : item,
        ),
      )
      await refreshCount()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      const map: Record<string, string> = {
        EVENT_FULL: 'Свободных мест больше нет',
        NOT_A_GUEST: 'Заявка уже неактуальна',
        REQUEST_ALREADY_REVIEWED: 'Заявка уже обработана',
        ACCESS_DENIED: 'Нет доступа',
      }
      setReviewError(e.code ? map[e.code] || 'Не удалось обработать заявку' : 'Не удалось обработать заявку')
    } finally {
      setReviewingId(null)
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

          {reviewError && (
            <p className="border-b border-gray-100 px-4 py-2 text-xs text-red-600">{reviewError}</p>
          )}

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">Загрузка...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Уведомлений нет</p>
            ) : (
              <ul>
                {notifications.map((n) =>
                  n.type === 'RSVP_REQUEST' ? (
                    <li key={n.id} className="border-b border-gray-100 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Avatar
                          url={n.payload.guestAvatarUrl}
                          name={n.payload.guestNickname}
                          size="w-8 h-8"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${n.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                            {n.payload.guestId ? (
                              <Link
                                href={`/users/${n.payload.guestId}`}
                                onClick={() => handleOpen(n)}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {n.payload.guestNickname || 'Пользователь'}
                              </Link>
                            ) : (
                              <span className="font-medium">
                                {n.payload.guestNickname || 'Пользователь'}
                              </span>
                            )}{' '}
                            хочет пойти на{' '}
                            <Link
                              href={`/events/${n.payload.eventId}`}
                              onClick={() => handleOpen(n)}
                              className="text-blue-600 hover:underline"
                            >
                              «{n.payload.eventTitle || 'событие'}»
                            </Link>
                          </p>
                          <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>

                          {n.payload.decision ? (
                            <p
                              className={`mt-2 text-xs font-medium ${
                                n.payload.decision === 'approved'
                                  ? 'text-green-700'
                                  : 'text-red-600'
                              }`}
                            >
                              {n.payload.decision === 'approved'
                                ? 'Заявка принята'
                                : 'Заявка отклонена'}
                            </p>
                          ) : (
                            n.payload.guestId && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => handleReview(n, 'approve')}
                                  disabled={reviewingId === n.id}
                                  className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                                >
                                  {reviewingId === n.id ? '...' : 'Принять'}
                                </button>
                                <button
                                  onClick={() => handleReview(n, 'reject')}
                                  disabled={reviewingId === n.id}
                                  className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                                >
                                  Отклонить
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </li>
                  ) : (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 ${
                          n.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'
                        }`}
                      >
                        <span className="block">
                          <strong>{n.payload.hostName || 'Хост'}</strong> создал(а) сбор «
                          {n.payload.title || 'событие'}»
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
