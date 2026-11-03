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
  addressPublic?: string | null
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

function isUpcoming(event: { startsAt: string }): boolean {
  const startsAt = new Date(event.startsAt).getTime()
  return !Number.isNaN(startsAt) && startsAt >= Date.now()
}

const THEMES = ['Кино', 'Настолки', 'Музыка', 'Книжный клуб', 'Мастер-класс', 'Другое']

// Карточки категорий в стиле Avito: подпись сверху, крупная иллюстрация снизу справа.
const CATEGORY_CARDS = [
  {
    value: '',
    label: 'Все события',
    emoji: '🎉',
    gradient:
      'from-sky-100 via-blue-50 to-white dark:from-sky-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Кино',
    label: 'Кино',
    emoji: '🎬',
    gradient:
      'from-indigo-100 via-indigo-50 to-white dark:from-indigo-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Настолки',
    label: 'Настолки',
    emoji: '🎲',
    gradient:
      'from-amber-100 via-amber-50 to-white dark:from-amber-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Музыка',
    label: 'Музыка',
    emoji: '🎸',
    gradient:
      'from-pink-100 via-pink-50 to-white dark:from-pink-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Книжный клуб',
    label: 'Книжный клуб',
    emoji: '📚',
    gradient:
      'from-emerald-100 via-emerald-50 to-white dark:from-emerald-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Мастер-класс',
    label: 'Мастер-класс',
    emoji: '🎨',
    gradient:
      'from-purple-100 via-purple-50 to-white dark:from-purple-500/25 dark:via-slate-800 dark:to-slate-800',
  },
  {
    value: 'Другое',
    label: 'Другое',
    emoji: '✨',
    gradient:
      'from-slate-100 via-slate-50 to-white dark:from-slate-500/25 dark:via-slate-800 dark:to-slate-800',
  },
]

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

  const selectTheme = (value: string) => {
    setActiveFeed('all')
    setTheme(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFeed('all')
    setDebouncedSearch(search)
  }

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
      const feedParams = new URLSearchParams({ limit: '200' })
      if (city) feedParams.set('city', city)
      const feedPath = `/feed/events?${feedParams.toString()}`

      Promise.all([
        api.get<{ success: boolean; events: EventItem[] }>(feedPath),
        api.get<{ success: boolean; users: { id: string }[] }>(`/users/${user.id}/following`),
      ])
        .then(([feed, follow]) => {
          if (!cancelled) {
            setEvents((feed.events || []).filter(isUpcoming))
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
      const params = new URLSearchParams({ status: 'published', limit: '200' })
      const q = debouncedSearch.trim()
      if (q) params.set('search', q)
      if (theme) params.set('theme', theme)
      if (city) params.set('city', city)
      api
        .get<{ success: boolean; events: EventItem[] }>(`/events?${params.toString()}`)
        .then((data) => {
          if (!cancelled) setEvents((data.events || []).filter(isUpcoming))
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
        {/* Поиск в стиле Avito: категория, строка поиска и кнопка «Найти» */}
        <form
          onSubmit={handleSearchSubmit}
          className="mb-4 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 sm:flex-row sm:items-center"
        >
          <div className="relative flex items-center gap-2 rounded-xl bg-gray-50 px-3 sm:min-w-[12rem]">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
            </svg>
            <select
              aria-label="Категория"
              value={theme}
              onChange={(e) => selectTheme(e.target.value)}
              className="w-full appearance-none bg-transparent py-2.5 pr-7 text-sm font-medium text-gray-700 focus:outline-none dark:bg-transparent"
            >
              <option value="">Все категории</option>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-300 px-3">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                if (activeFeed !== 'all') setActiveFeed('all')
                setSearch(e.target.value)
              }}
              placeholder="Поиск по названию или описанию..."
              aria-label="Поиск событий"
              className="w-full bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-transparent"
            />
          </div>

          <button
            type="submit"
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Найти
          </button>
        </form>

        {/* Категории событий */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_CARDS.map((category) => {
            const active = theme === category.value
            return (
              <button
                key={category.value || 'all'}
                type="button"
                onClick={() => selectTheme(category.value)}
                aria-pressed={active}
                className={`group relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${category.gradient} ${
                  active ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200/70 dark:ring-slate-700'
                }`}
              >
                <span className="relative z-10 block max-w-[70%] text-sm font-semibold leading-snug text-gray-900">
                  {category.label}
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-2 -right-1 text-5xl transition-transform duration-200 group-hover:scale-110"
                >
                  {category.emoji}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {city ? `События в ${city}` : 'Все события'}
          </h1>

          <div className="flex gap-2">
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
                <li
                  key={ev.id}
                  className="relative p-5 bg-white rounded-lg shadow transition hover:shadow-md"
                >
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
                      {ev.addressPublic && (
                        <p className="mt-1 text-sm text-gray-600">🏠 {ev.addressPublic}</p>
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
                          <Link
                            href={`/users/${ev.host.id}`}
                            className="relative z-10 text-blue-600 hover:underline"
                          >
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
                  <Link
                    href={`/events/${ev.id}`}
                    aria-label={`Открыть событие «${ev.title}»`}
                    className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
