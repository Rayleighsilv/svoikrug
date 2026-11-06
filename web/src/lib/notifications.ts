export type NotificationPayload = {
  eventId: string
  title?: string
  hostName?: string
  eventTitle?: string
  guestId?: string
  guestNickname?: string
  guestAvatarUrl?: string | null
  guestTrustScore?: number | null
  applicationAnswer?: string | null
  decision?: 'approved' | 'rejected'
  message?: string
}

export type NotificationItem = {
  id: string
  type: string
  payload: NotificationPayload
  isRead: boolean
  createdAt: string
}

export type NotificationGroupKey = 'requests' | 'events' | 'system' | 'security'

export const NOTIFICATION_GROUPS: { key: NotificationGroupKey; label: string }[] = [
  { key: 'requests', label: 'Заявки' },
  { key: 'events', label: 'Мои события' },
  { key: 'system', label: 'Системные' },
  { key: 'security', label: 'Безопасность' },
]

export function notificationGroup(type: string): NotificationGroupKey {
  if (type === 'RSVP_REQUEST') return 'requests'
  if (type === 'NEW_EVENT_FROM_SUBSCRIPTION' || type === 'RSVP_DECISION') return 'events'
  if (type.startsWith('SECURITY') || type === 'REPORT') return 'security'
  return 'system'
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return date.toLocaleDateString('ru-RU')
}

export function dispatchNotificationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sk:notifications-updated'))
  }
}
