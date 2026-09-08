'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type EventItem = {
  id: string
  title: string
  theme?: string | null
  startsAt: string
  maxGuests?: number | null
  host: {
    id: string
    profile?: { nickname: string } | null
  }
  _count: { guests: number }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function freeSpots(event: EventItem): number | null {
  if (event.maxGuests == null) return null
  return Math.max(event.maxGuests - event._count.guests, 0)
}

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFeed, setActiveFeed] = useState<'all' | 'following'>('all')
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    if (activeFeed === 'following' && !user) {
      setEvents([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    if (activeFeed === 'following' && user) {
      Promise.all([
        api.get<{ success: boolean; events: EventItem[] }>('/feed/events'),
        api.get<{ success: boolean; users: { id: string }[] }>(`/users/${user.id}/following`),
      ])
        .then(([feed, follow]) => {
          if (!cancelled) {
            setEvents(feed.events || [])
            setFollowingCount((follow.users || []).length)
          }
        })
        .catch((err) => {
          console.error('Ошибка загрузки ленты:', err)
          if (!cancelled) setError('Не удалось загрузить ленту. Попробуйте позже.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      api
        .get<{ success: boolean; events: EventItem[] }>('/events?status=published')
        .then((data) => {
          if (!cancelled) setEvents(data.events || [])
        })
        .catch((err) => {
          console.error('Ошибка загрузки событий:', err)
          if (!cancelled) setError('Не удалось загрузить события. Попробуйте позже.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [activeFeed, user])

  const handleLogout = async () => {
    await logout()
    router.replace('/')
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Шапка с навигацией */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            SvoiKrug
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {!authLoading &&
              (user ? (
                <>
                  <span className="text-gray-700 font-medium">
                    {user.profile?.nickname || user.email}
                  </span>
                  <Link href="/events/new" className="text-blue-600 hover:underline">
                    Создать событие
                  </Link>
                  <Link href="/profile" className="text-blue-600 hover:underline">
                    Профиль
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Войти
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Регистрация
                  </Link>
                </>
              ))}
          </nav>
        </div>
      </header>

      {/* Лента событий */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-4">Активные сборы</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveFeed('all')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              activeFeed === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 shadow'
            }`}
          >
            Все события
          </button>
          <button
            onClick={() => setActiveFeed('following')}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              activeFeed === 'following' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 shadow'
            }`}
          >
            Для вас
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Загрузка событий...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : activeFeed === 'following' && !user ? (
          <div className="p-10 text-center bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg mb-4">Войдите, чтобы видеть ленту «Для вас»</p>
            <Link href="/login?from=/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Войти
            </Link>
          </div>
        ) : events.length === 0 ? (
          activeFeed === 'following' ? (
            followingCount === 0 ? (
              <div className="p-10 text-center bg-white rounded-lg shadow">
                <p className="text-gray-600 text-lg">Вы пока ни на кого не подписаны.</p>
                <p className="text-gray-500 mt-2">Находите хостов в ленте и подписывайтесь.</p>
                <button
                  onClick={() => setActiveFeed('all')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Смотреть все события
                </button>
              </div>
            ) : (
              <p className="text-gray-600">Пока нет событий от тех, на кого вы подписаны.</p>
            )
          ) : (
            <div className="p-10 text-center bg-white rounded-lg shadow">
              <p className="text-gray-600 text-lg">Пока нет активных сборов. Будьте первым!</p>
            </div>
          )
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => {
              const spots = freeSpots(ev)
              return (
                <li key={ev.id} className="p-5 bg-white rounded-lg shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{ev.title}</h2>
                      {ev.theme && <p className="text-sm text-gray-500 mt-0.5">Тема: {ev.theme}</p>}
                      <p className="text-sm text-gray-600 mt-2">🕒 {formatDateTime(ev.startsAt)}</p>
                      <p className="text-sm text-gray-600">
                        👤 Хост:{' '}
                        <Link href={`/users/${ev.host.id}`} className="text-blue-600 hover:underline">
                          {ev.host.profile?.nickname || 'Без имени'}
                        </Link>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-medium text-gray-700">
                        {spots == null
                          ? 'Мест — без ограничений'
                          : spots > 0
                            ? `Свободно: ${spots} мест`
                            : 'Мест нет'}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
