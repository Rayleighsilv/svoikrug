'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'

type ConnectionUser = {
  id: string
  nickname: string | null
  avatarUrl?: string | null
  trustScore?: number
}

export type ConnectionsTab = 'following' | 'followers'

export default function ConnectionsModal({
  userId,
  initialTab,
  onClose,
}: {
  userId: string
  initialTab: ConnectionsTab
  onClose: () => void
}) {
  const [tab, setTab] = useState<ConnectionsTab>(initialTab)
  const [following, setFollowing] = useState<ConnectionUser[]>([])
  const [followers, setFollowers] = useState<ConnectionUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Escape + блокировка прокрутки страницы под модалкой.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      api.get<{ success: boolean; users: ConnectionUser[] }>(`/users/${userId}/following`),
      api.get<{ success: boolean; users: ConnectionUser[] }>(`/users/${userId}/followers`),
    ])
      .then(([followingData, followersData]) => {
        if (cancelled) return
        setFollowing(followingData.users || [])
        setFollowers(followersData.users || [])
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить список')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, reloadKey])

  const users = tab === 'following' ? following : followers
  const emptyText =
    tab === 'following' ? 'Вы пока ни на кого не подписаны' : 'У вас пока нет подписчиков'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connections-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="connections-title" className="text-lg font-semibold text-gray-900">
            Мои связи
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab('following')}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === 'following'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Подписки{!loading && !error ? ` (${following.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('followers')}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === 'followers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Подписчики{!loading && !error ? ` (${followers.length})` : ''}
          </button>
        </div>

        <div className="min-h-[12rem] flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-gray-500">Загрузка...</p>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Повторить
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">{emptyText}</p>
              {tab === 'following' && (
                <Link
                  href="/"
                  onClick={onClose}
                  className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                >
                  Найти хостов в ленте
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/users/${person.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                  >
                    <Avatar
                      url={person.avatarUrl}
                      name={person.nickname}
                      size="w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {person.nickname || 'Без имени'}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        Trust Score: {person.trustScore ?? 0}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-blue-600">
                      Профиль
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
