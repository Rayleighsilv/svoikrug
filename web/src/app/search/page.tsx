'use client'

import { useEffect, useState } from 'react'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import EventCard, { type EventCardEvent } from '@/components/EventCard'
import EventListSkeleton from '@/components/EventListSkeleton'
import Header from '@/components/Header'
import OfflineFeed from '@/components/OfflineFeed'

type EventItem = EventCardEvent

function isUpcoming(event: { startsAt: string }): boolean {
  const startsAt = new Date(event.startsAt).getTime()
  return !Number.isNaN(startsAt) && startsAt >= Date.now()
}

export default function SearchPage() {
  const { city, ready: cityReady } = useCity()
  const online = useOnlineStatus()

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!cityReady || !online) return

    if (!debounced) {
      setEvents([])
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    const params = new URLSearchParams({
      status: 'published',
      limit: '50',
      search: debounced,
    })
    if (city) params.set('city', city)

    api
      .get<{ success: boolean; events: EventItem[] }>(`/events?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setEvents((data.events || []).filter(isUpcoming))
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось выполнить поиск. Попробуйте позже.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced, city, cityReady, online, reloadKey])

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">Поиск</h1>
        <p className="mt-1 text-sm text-gray-500">
          Название, тема или описание встречи
        </p>

        <form role="search" onSubmit={(event) => event.preventDefault()} className="mt-4">
          <label htmlFor="event-search" className="sr-only">
            Поиск событий
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-500">
            <svg
              className="h-5 w-5 shrink-0 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              id="event-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: квартирник, настолки, кино"
              autoComplete="off"
              className="w-full bg-transparent py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
            />
          </div>
        </form>

        <section aria-labelledby="search-results-title" className="mt-6">
          <h2 id="search-results-title" className="mb-3 text-lg font-semibold">
            {online ? 'Результаты' : 'Офлайн-доступ'}
          </h2>

          {!online ? (
            <OfflineFeed />
          ) : !debounced ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-lg text-gray-700">Введите запрос</p>
              <p className="mt-2 text-sm text-gray-500">
                Покажем встречи, которые проходят в вашем городе.
              </p>
            </div>
          ) : loading ? (
            <EventListSkeleton count={2} />
          ) : error ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Повторить
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-lg text-gray-700">Ничего не найдено</p>
              <p className="mt-2 text-sm text-gray-500">
                Попробуйте другое название или смените город в шапке.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-live="polite">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
