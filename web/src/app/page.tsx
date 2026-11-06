'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import {
  ALL_FORMAT_TILE,
  FORMATS,
  FORMAT_BY_SLUG,
  countForCity,
  type EventFormat,
} from '@/lib/formats'
import { meetingsWord } from '@/lib/reviews'
import { useTags } from '@/lib/tags'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import CategoryTile from '@/components/CategoryTile'
import EventCard, { type EventCardEvent } from '@/components/EventCard'
import EventListSkeleton from '@/components/EventListSkeleton'
import EventSidebar from '@/components/EventSidebar'
import Header from '@/components/Header'
import HostToolsPanel from '@/components/HostToolsPanel'
import OfflineFeed from '@/components/OfflineFeed'

type EventItem = EventCardEvent

const FORMAT_TABS: { value: '' | EventFormat; label: string }[] = [
  { value: '', label: 'Все' },
  ...FORMATS.map((format) => ({ value: format.slug, label: format.label })),
]

function isUpcoming(event: { startsAt: string }): boolean {
  const startsAt = new Date(event.startsAt).getTime()
  return !Number.isNaN(startsAt) && startsAt >= Date.now()
}

export default function Home() {
  const { user } = useAuth()
  const { city, setCity, ready: cityReady } = useCity()
  const { tags: tagCatalog } = useTags()
  const online = useOnlineStatus()

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [activeFeed, setActiveFeed] = useState<'all' | 'following'>('all')
  const [followingCount, setFollowingCount] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState<'' | EventFormat>('')
  const [tag, setTag] = useState('')

  // Дебаунс поискового ввода (~350 мс), чтобы не дёргать API на каждый символ.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFeed('all')
    setDebouncedSearch(search)
  }

  useEffect(() => {
    if (!cityReady) return

    // Без сети не дёргаем API: показываем сохранённые на устройстве события.
    if (!online) {
      setLoading(false)
      setError(null)
      return
    }

    if (activeFeed === 'following' && !user) {
      setEvents([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ limit: '200' })
    if (city) params.set('city', city)
    if (tag) params.set('tag', tag)
    if (formatFilter) params.set('format', formatFilter)

    const request =
      activeFeed === 'following' && user
        ? Promise.all([
            api.get<{ success: boolean; events: EventItem[] }>(
              `/feed/events?${params.toString()}`,
            ),
            api.get<{ success: boolean; users: { id: string }[] }>(
              `/users/${user.id}/following`,
            ),
          ]).then(([feed, follow]) => ({
            events: feed.events || [],
            following: (follow.users || []).length,
          }))
        : (() => {
            const listParams = new URLSearchParams(params)
            listParams.set('status', 'published')
            const query = debouncedSearch.trim()
            if (query) listParams.set('search', query)
            return api
              .get<{ success: boolean; events: EventItem[] }>(
                `/events?${listParams.toString()}`,
              )
              .then((data) => ({ events: data.events || [], following: null }))
          })()

    request
      .then(({ events: nextEvents, following }) => {
        if (cancelled) return
        setEvents(nextEvents.filter(isUpcoming))
        if (following != null) setFollowingCount(following)
      })
      .catch((err) => {
        console.error('Ошибка загрузки событий:', err)
        if (!cancelled) setError('Не удалось загрузить события. Попробуйте позже.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeFeed, user, debouncedSearch, formatFilter, tag, city, cityReady, online, reloadKey])

  const activeFormat = formatFilter ? FORMAT_BY_SLUG[formatFilter] : null
  const heading = activeFormat
    ? `${activeFormat.label}${city ? ` · ${city}` : ''}`
    : city
      ? `События в ${city}`
      : 'Все события'

  // Счётчики плиток — mock, но зависят от выбранного в шапке города.
  const cityFormatCounts = Object.fromEntries(
    FORMATS.map((format) => [format.slug, countForCity(format.weeklyCount, city, format.slug)]),
  ) as Record<EventFormat, number>
  const allWeeklyCount = FORMATS.reduce(
    (sum, format) => sum + cityFormatCounts[format.slug],
    0,
  )

  const formatEmpty = (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
      <p className="text-lg text-gray-600">
        В этом формате пока нет встреч в твоём городе — создай свою
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {city && (
          <button
            type="button"
            onClick={() => setCity(null)}
            className="rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Показать все города
          </button>
        )}
        <Link
          href="/events/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          Создать событие
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Поиск в стиле Avito: формат, строка поиска и кнопка «Найти» */}
        <form
          role="search"
          aria-label="Поиск событий"
          onSubmit={handleSearchSubmit}
          className="mb-4 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 sm:flex-row sm:items-center"
        >
          <div className="relative flex items-center gap-2 rounded-xl bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-blue-500 sm:min-w-[12rem]">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
            </svg>
            <select
              aria-label="Формат"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as '' | EventFormat)}
              className="w-full appearance-none bg-transparent py-2.5 pr-7 text-sm font-medium text-gray-700 focus:outline-none dark:bg-transparent"
            >
              <option value="">Все форматы</option>
              {FORMATS.map((format) => (
                <option key={format.slug} value={format.slug}>
                  {format.label}
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

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-300 px-3 focus-within:ring-2 focus-within:ring-blue-500">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {/* Сегмент-табы форматов */}
            <div className="mb-4 flex flex-wrap gap-2">
              {FORMAT_TABS.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  type="button"
                  onClick={() => setFormatFilter(tab.value)}
                  aria-pressed={formatFilter === tab.value}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    formatFilter === tab.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 shadow'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Плитки форматов */}
            <section aria-label="Форматы встреч" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CategoryTile
                label={ALL_FORMAT_TILE.label}
                emoji={ALL_FORMAT_TILE.emoji}
                meta={`${allWeeklyCount} ${meetingsWord(allWeeklyCount)} на неделе`}
                gradient={ALL_FORMAT_TILE.gradient}
                active={formatFilter === ''}
                onClick={() => setFormatFilter('')}
              />
              {FORMATS.map((format) => (
                <CategoryTile
                  key={format.slug}
                  label={format.label}
                  emoji={format.emoji}
                  meta={`${cityFormatCounts[format.slug]} ${meetingsWord(
                    cityFormatCounts[format.slug],
                  )} на неделе`}
                  gradient={format.gradient}
                  href={`/format/${format.slug}`}
                />
              ))}
            </section>

            <HostToolsPanel />

            {/* Вайб-чипы */}
            {tagCatalog.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-medium text-gray-500">Вайб:</span>
                <button
                  type="button"
                  onClick={() => setTag('')}
                  aria-pressed={!tag}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    !tag
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                  }`}
                >
                  Все
                </button>
                {tagCatalog.map((item) => {
                  const active = tag === item.slug
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => setTag(active ? '' : item.slug)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            <section aria-labelledby="events-feed-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 id="events-feed-title" className="text-2xl font-bold">
                {heading}
              </h1>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveFeed('all')}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    activeFeed === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 shadow'
                  }`}
                >
                  Все события
                </button>
                <button
                  onClick={() => setActiveFeed('following')}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    activeFeed === 'following'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 shadow'
                  }`}
                >
                  Для вас
                </button>
              </div>
            </div>

            {!online ? (
              <OfflineFeed />
            ) : loading ? (
              <EventListSkeleton />
            ) : error ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Повторить
                </button>
              </div>
            ) : activeFeed === 'following' && !user ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                <p className="mb-4 text-lg text-gray-600">
                  Войдите, чтобы видеть ленту «Для вас»
                </p>
                <Link
                  href="/login?from=/"
                  className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Войти
                </Link>
              </div>
            ) : events.length === 0 ? (
              activeFeed === 'following' ? (
                followingCount === 0 ? (
                  <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                    <p className="text-lg text-gray-600">Вы пока ни на кого не подписаны.</p>
                    <p className="mt-2 text-gray-500">
                      Находите хостов в ленте и подписывайтесь.
                    </p>
                    <button
                      onClick={() => setActiveFeed('all')}
                      className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      Смотреть все события
                    </button>
                  </div>
                ) : formatFilter ? (
                  formatEmpty
                ) : (
                  <p className="text-gray-600">
                    Пока нет событий от тех, на кого вы подписаны.
                  </p>
                )
              ) : formatFilter ? (
                formatEmpty
              ) : search.trim() || tag ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                  <p className="text-lg text-gray-600">Ничего не найдено по вашему запросу</p>
                </div>
              ) : city ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                  <p className="text-lg text-gray-600">В городе {city} пока нет событий</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setCity(null)}
                      className="rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      Показать все города
                    </button>
                    <Link
                      href="/events/new"
                      className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                    >
                      Создать событие
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
                  <p className="text-lg text-gray-600">
                    Пока нет активных сборов. Будьте первым!
                  </p>
                </div>
              )
            ) : (
              <ul className="space-y-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </ul>
            )}
            </section>
          </div>

          <EventSidebar />
        </div>
      </div>
    </main>
  )
}
