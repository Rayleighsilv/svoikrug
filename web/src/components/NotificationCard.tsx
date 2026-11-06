'use client'

import Link from 'next/link'
import Avatar from '@/components/Avatar'
import {
  formatNotificationTime,
  type NotificationItem,
} from '@/lib/notifications'

export default function NotificationCard({
  notification,
  reviewing,
  compact = false,
  onReview,
  onMarkRead,
  onOpen,
}: {
  notification: NotificationItem
  reviewing: boolean
  compact?: boolean
  onReview: (item: NotificationItem, action: 'approve' | 'reject') => void
  onMarkRead: (item: NotificationItem) => void
  onOpen?: () => void
}) {
  const { payload } = notification
  const eventTitle = payload.eventTitle || payload.title || 'событие'
  const eventHref = payload.eventId ? `/events/${payload.eventId}` : null
  const rating = payload.guestTrustScore ?? 0
  const padding = compact ? 'px-3 py-2.5' : 'px-4 py-3'

  const open = () => {
    void onMarkRead(notification)
    onOpen?.()
  }

  if (notification.type === 'RSVP_REQUEST') {
    return (
      <li
        className={`border-b border-gray-100 ${padding} ${
          notification.isRead ? 'bg-white' : 'bg-blue-50'
        }`}
      >
        <div className="flex items-start gap-2">
          <Avatar
            url={payload.guestAvatarUrl}
            name={payload.guestNickname}
            size="w-8 h-8"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {payload.guestId ? (
                <Link
                  href={`/users/${payload.guestId}`}
                  onClick={open}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {payload.guestNickname || 'Пользователь'}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {payload.guestNickname || 'Пользователь'}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {rating > 0 ? (
                  <>
                    <span className="text-amber-500" aria-hidden="true">
                      ★
                    </span>{' '}
                    {rating.toFixed(1)}
                  </>
                ) : (
                  'Без отзывов'
                )}
              </span>
            </div>

            <p className="text-sm text-gray-700">
              хочет пойти на{' '}
              {eventHref ? (
                <Link
                  href={eventHref}
                  onClick={open}
                  className="font-medium text-blue-600 hover:underline"
                >
                  «{eventTitle}»
                </Link>
              ) : (
                <span className="font-medium">«{eventTitle}»</span>
              )}
            </p>

            {payload.applicationAnswer && (
              <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">Ответ: </span>
                {payload.applicationAnswer}
              </p>
            )}

            <span className="mt-1 block text-xs text-gray-400">
              {formatNotificationTime(notification.createdAt)}
            </span>

            {payload.decision ? (
              <p
                className={`mt-2 text-xs font-medium ${
                  payload.decision === 'approved' ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {payload.decision === 'approved' ? 'Заявка принята' : 'Заявка отклонена'}
              </p>
            ) : (
              payload.guestId && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onReview(notification, 'approve')}
                    disabled={reviewing}
                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {reviewing ? '...' : 'Одобрить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(notification, 'reject')}
                    disabled={reviewing}
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
    )
  }

  if (notification.type === 'RSVP_DECISION') {
    const approved = payload.decision === 'approved'
    return (
      <li
        className={`border-b border-gray-100 ${padding} ${
          notification.isRead ? 'bg-white' : 'bg-blue-50'
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-lg" aria-hidden="true">
            {approved ? '✓' : '✕'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-700">
              {payload.hostName || 'Организатор'} {approved ? 'одобрил(а)' : 'отклонил(а)'}{' '}
              вашу заявку на{' '}
              {eventHref ? (
                <Link
                  href={eventHref}
                  onClick={open}
                  className="font-medium text-blue-600 hover:underline"
                >
                  «{eventTitle}»
                </Link>
              ) : (
                <span className="font-medium">«{eventTitle}»</span>
              )}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${
                approved ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {approved
                ? 'Точный адрес открыт на странице события'
                : 'Точный адрес остаётся скрытым'}
            </p>
            <span className="mt-1 block text-xs text-gray-400">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </div>
        </div>
      </li>
    )
  }

  if (notification.type === 'NEW_EVENT_FROM_SUBSCRIPTION') {
    return (
      <li
        className={`border-b border-gray-100 ${
          notification.isRead ? 'bg-white' : 'bg-blue-50'
        }`}
      >
        <Link
          href={eventHref ?? '#'}
          onClick={open}
          className={`block ${padding} transition hover:bg-gray-50`}
        >
          <span className="block text-sm text-gray-700">
            <span className="font-medium">{payload.hostName || 'Хост'}</span> создал(а) сбор
            «{eventTitle}»
          </span>
          <span className="mt-1 block text-xs text-gray-400">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </Link>
      </li>
    )
  }

  return (
    <li
      className={`border-b border-gray-100 ${padding} ${
        notification.isRead ? 'bg-white' : 'bg-blue-50'
      }`}
    >
      <button type="button" onClick={open} className="w-full text-left">
        <span className="block text-sm text-gray-700">
          {payload.message || 'Системное уведомление'}
        </span>
        <span className="mt-1 block text-xs text-gray-400">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </button>
    </li>
  )
}
