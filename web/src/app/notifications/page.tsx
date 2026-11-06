'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/lib/useNotifications'
import Header from '@/components/Header'
import NotificationsList from '@/components/NotificationsList'

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
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
  } = useNotifications({ autoLoad: true, limit: 100 })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?from=/notifications')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  const unread = notifications.filter((item) => !item.isRead).length

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← На главную
        </Link>

        <div className="mb-4 mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Уведомления</h1>
            <p className="mt-1 text-sm text-gray-500">
              {unread > 0 ? `Непрочитанных: ${unread}` : 'Всё прочитано'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Обновить
            </button>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
            >
              Отметить все
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:ring-slate-700">
          <NotificationsList
            notifications={notifications}
            loading={loading}
            error={error}
            reviewError={reviewError}
            reviewingId={reviewingId}
            onRetry={load}
            onReview={review}
            onMarkRead={markRead}
          />
        </div>
      </div>
    </main>
  )
}
