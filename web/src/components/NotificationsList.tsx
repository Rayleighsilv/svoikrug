'use client'

import { useState } from 'react'
import NotificationCard from '@/components/NotificationCard'
import {
  NOTIFICATION_GROUPS,
  notificationGroup,
  type NotificationGroupKey,
  type NotificationItem,
} from '@/lib/notifications'

export default function NotificationsList({
  notifications,
  loading,
  error,
  reviewError,
  reviewingId,
  compact = false,
  onRetry,
  onReview,
  onMarkRead,
  onOpen,
}: {
  notifications: NotificationItem[]
  loading: boolean
  error: string
  reviewError: string
  reviewingId: string | null
  compact?: boolean
  onRetry: () => void
  onReview: (item: NotificationItem, action: 'approve' | 'reject') => void
  onMarkRead: (item: NotificationItem) => void
  onOpen?: () => void
}) {
  const [activeGroup, setActiveGroup] = useState<NotificationGroupKey>('requests')

  const counts = Object.fromEntries(
    NOTIFICATION_GROUPS.map((group) => [
      group.key,
      notifications.filter((item) => notificationGroup(item.type) === group.key).length,
    ]),
  ) as Record<NotificationGroupKey, number>

  const visible = notifications.filter(
    (item) => notificationGroup(item.type) === activeGroup,
  )

  return (
    <div>
      <div
        className={`flex flex-wrap gap-1.5 border-b border-gray-200 ${
          compact ? 'px-3 py-2' : 'px-4 py-3'
        }`}
      >
        {NOTIFICATION_GROUPS.map((group) => {
          const active = activeGroup === group.key
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {group.label}
              {counts[group.key] > 0 && (
                <span className={`ml-1 ${active ? 'text-blue-100' : 'text-gray-400'}`}>
                  {counts[group.key]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {reviewError && (
        <p className="border-b border-gray-100 px-4 py-2 text-xs text-red-600">
          {reviewError}
        </p>
      )}

      {loading ? (
        <div className="space-y-3 p-4" aria-label="Загрузка уведомлений">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-2">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Повторить
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-600">Пока тихо</p>
          <p className="mt-1 text-xs text-gray-400">
            {activeGroup === 'requests'
              ? 'Новые заявки на ваши события появятся здесь.'
              : activeGroup === 'events'
                ? 'Здесь будут решения по заявкам и новые события хостов.'
                : 'Здесь появятся системные сообщения.'}
          </p>
        </div>
      ) : (
        <ul>
          {visible.map((item) => (
            <NotificationCard
              key={item.id}
              notification={item}
              reviewing={reviewingId === item.id}
              compact={compact}
              onReview={onReview}
              onMarkRead={onMarkRead}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
