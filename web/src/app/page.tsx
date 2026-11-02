'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'
import Header from '@/components/Header'

type EventItem = {
  id: string
  title: string
  theme?: string | null
  city?: string | null
  startsAt: string
  maxGuests?: number | null
  host: {
    id: string
    profile?: { nickname: string; avatarUrl?: string | null } | null
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

const THEMES = ['Кино', 'Настолки', 'Музыка', 'Книжный клуб', 'Мастер-класс', 'Другое']

export default function Home() {
  const { user } = useAuth()
  const { city, setCity, ready: cityReady } = useCity()

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFeed, setActiveFeed] = useState<'all' | 'following'>('all')
  const [followingCount, setFollowingCount] = useState(0)
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Дебаунс поискового ввода (~350 мс), чтобы не дёргать API на каждый символ.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!cityReady) return

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
      const feedParams = new URLSearchParams()
      if (city) feedParams.set('city', city)
      const feedPath = feedParams.toString() ? `/feed/events?${feedParams}` : '/feed/events'

      Promise.all([
        api.get<{ success: boolean; events: EventItem[] }>(feedPath),
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
      const params = new URLSearchParams({ status: 'published' })
      const q = debouncedSearch.trim()
      if (q) params.set('search', q)
      if (theme) params.set('theme', theme)
      if (city) params.set('city', city)
      api
        .get<{ success: boolean; events: EventItem[] }>(`/events?${params.toString()}`)
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
  }, [activeFeed, user, debouncedSearch, theme, city, cityReady])

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* Лента событий */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-4">
          {city ? `События в ${city}` : 'Все события'}
        </h1>

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

        {activeFeed === 'all' && (
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или описанию..."
              className="flex-1 p-2 border border-gray-300 rounded text-gray-900 placeholder:text-gray-400"
            />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="p-2 border border-gray-300 rounded text-gray-900"
            >
              <option value="">Все тематики</option>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

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
        ) : city && events.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">В городе {city} пока нет событий</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setCity(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
              >
                Показать все города
              </button>
              <Link
                href="/events/new"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Создать событие
              </Link>
            </div>
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
          ) : search.trim() || theme ? (
            <div className="p-10 text-center bg-white rounded-lg shadow">
              <p className="text-gray-600 text-lg">Ничего не найдено по вашему запросу</p>
            </div>
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
                      {ev.city && (
                        <p className="mt-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            📍 {ev.city}
                          </span>
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">🕒 {formatDateTime(ev.startsAt)}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Avatar
                          url={ev.host.profile?.avatarUrl}
                          name={ev.host.profile?.nickname}
                          size="w-6 h-6"
                        />
                        <span>
                          👤 Хост:{' '}
                          <Link href={`/users/${ev.host.id}`} className="text-blue-600 hover:underline">
                            {ev.host.profile?.nickname || 'Без имени'}
                          </Link>
                        </span>
                      </div>
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
