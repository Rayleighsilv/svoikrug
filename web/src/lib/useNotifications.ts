'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import {
  dispatchNotificationsUpdated,
  type NotificationItem,
} from './notifications'

export function useNotifications({
  autoLoad = false,
  limit = 50,
}: {
  autoLoad?: boolean
  limit?: number
} = {}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setReviewError('')
    try {
      const data = await api.get<{
        success: boolean
        notifications: NotificationItem[]
      }>(`/notifications?limit=${limit}`)
      setNotifications(data.notifications || [])
    } catch {
      setError('Не удалось загрузить уведомления')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    if (autoLoad) void load()
  }, [autoLoad, load])

  const markRead = useCallback(async (item: NotificationItem) => {
    if (item.isRead) return
    try {
      await api.post(`/notifications/${item.id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      )
      dispatchNotificationsUpdated()
    } catch {
      // Не блокируем интерфейс из-за ошибки отметки.
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      dispatchNotificationsUpdated()
    } catch {
      // ignore
    }
  }, [])

  const review = useCallback(
    async (item: NotificationItem, action: 'approve' | 'reject') => {
      const guestId = item.payload.guestId
      if (!guestId) return

      setReviewingId(item.id)
      setReviewError('')
      try {
        await api.post(`/events/${item.payload.eventId}/guests/${guestId}/${action}`)
        const decision = action === 'approve' ? 'approved' : 'rejected'
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, isRead: true, payload: { ...n.payload, decision } }
              : n,
          ),
        )
        dispatchNotificationsUpdated()
      } catch (err) {
        const e = (err || {}) as { code?: string }
        const map: Record<string, string> = {
          EVENT_FULL: 'Свободных мест больше нет',
          NOT_A_GUEST: 'Заявка уже неактуальна',
          REQUEST_ALREADY_REVIEWED: 'Заявка уже обработана',
          ACCESS_DENIED: 'Нет доступа',
        }
        setReviewError(
          e.code
            ? map[e.code] || 'Не удалось обработать заявку'
            : 'Не удалось обработать заявку',
        )
      } finally {
        setReviewingId(null)
      }
    },
    [],
  )

  return {
    notifications,
    loading,
    error,
    reviewError,
    reviewingId,
    load,
    markRead,
    markAllRead,
    review,
  }
}
