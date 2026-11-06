'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EventImage from '@/components/EventImage'
import { formatEventDateTime } from '@/lib/date'
import { FORMAT_BY_SLUG, findSubcategory } from '@/lib/formats'
import {
  getRecentlyViewed,
  getSavedEvents,
  subscribeToEventHistory,
  type StoredEvent,
} from '@/lib/eventHistory'

type Source = 'saved' | 'viewed' | null

/**
 * PWA-фолбэк: без сети показываем сохранённые (или недавно просмотренные)
 * события из localStorage. Плитки форматов остаются на экране выше и
 * не требуют запросов.
 */
export default function OfflineFeed() {
  const [loaded, setLoaded] = useState(false)
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [source, setSource] = useState<Source>(null)

  useEffect(() => {
    const sync = () => {
      const saved = getSavedEvents()
      const viewed = getRecentlyViewed()
      setEvents(saved.length > 0 ? saved : viewed)
      setSource(saved.length > 0 ? 'saved' : viewed.length > 0 ? 'viewed' : null)
      setLoaded(true)
    }
    sync()
    return subscribeToEventHistory(sync)
  }, [])

  if (!loaded) {
    return (
      <div className="space-y-3" aria-label="Загрузка сохранённых событий">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section aria-labelledby="offline-feed-title" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          нет сети
        </span>
        <h2 id="offline-feed-title" className="text-sm font-medium text-gray-700">
          {source === 'viewed'
            ? 'Показываем недавно просмотренные события'
            : 'Показываем сохранённые события'}
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-lg text-gray-700">Нет подключения к интернету</p>
          <p className="mt-2 text-sm text-gray-500">
            Сохранённые события появятся здесь — откройте событие и нажмите «Сохранить».
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const format = FORMAT_BY_SLUG[event.format ?? 'offline']
            const subcategory = findSubcategory(event.subcategory)

            return (
              <li
                key={event.id}
                className="relative flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <EventImage
                  src={event.coverImageUrl}
                  alt={`Фото места: ${event.title}`}
                  fallback={{
                    emoji: subcategory?.emoji ?? format.emoji,
                    gradient: format.gradient,
                  }}
                  className="h-20 w-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {event.city ? `📍 ${event.city} · ` : ''}
                    {formatEventDateTime(event.startsAt)}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                    нет сети
                  </span>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  aria-label={`Открыть событие «${event.title}»`}
                  className="absolute inset-0 rounded-2xl"
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
