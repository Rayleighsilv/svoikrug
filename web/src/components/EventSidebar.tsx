'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EventImage from '@/components/EventImage'
import { formatDateTime } from '@/lib/date'
import {
  getRecentlyViewed,
  getSavedEvents,
  subscribeToEventHistory,
  type StoredEvent,
} from '@/lib/eventHistory'
import { FORMAT_BY_SLUG, findSubcategory } from '@/lib/formats'

function MiniCard({ event }: { event: StoredEvent }) {
  const format = FORMAT_BY_SLUG[event.format ?? 'offline']
  const subcategory = findSubcategory(event.subcategory)

  return (
    <li className="relative flex gap-3 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      <EventImage
        src={event.coverImageUrl}
        alt={`Фото события: ${event.title}`}
        fallback={{
          emoji: subcategory?.emoji ?? format.emoji,
          gradient: format.gradient,
        }}
        className="h-16 w-16 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-gray-900">{event.title}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {format.shortLabel}
          {event.city ? ` · ${event.city}` : ''}
        </p>
        <p className="text-xs text-gray-400">{formatDateTime(event.startsAt)}</p>
      </div>
      <Link
        href={`/events/${event.id}`}
        aria-label={`Открыть событие «${event.title}»`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />
    </li>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 text-sm text-gray-400 shadow-sm ring-1 ring-gray-100">
      {children}
    </div>
  )
}

export default function EventSidebar() {
  const [saved, setSaved] = useState<StoredEvent[]>([])
  const [viewed, setViewed] = useState<StoredEvent[]>([])

  useEffect(() => {
    const sync = () => {
      setSaved(getSavedEvents())
      setViewed(getRecentlyViewed())
    }
    sync()
    const unsubscribe = subscribeToEventHistory(sync)
    // Возврат по истории/из bfcache не всегда перемонтирует страницу —
    // перечитываем localStorage по событиям навигации и фокуса.
    window.addEventListener('popstate', sync)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      unsubscribe()
      window.removeEventListener('popstate', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Сохранённые</h2>
          {saved.length > 0 ? (
            <ul className="space-y-2">
              {saved.slice(0, 3).map((event) => (
                <MiniCard key={event.id} event={event} />
              ))}
            </ul>
          ) : (
            <EmptyHint>♡ Сохраняйте события, чтобы вернуться к ним</EmptyHint>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Вы смотрели</h2>
          {viewed.length > 0 ? (
            <ul className="space-y-2">
              {viewed.slice(0, 3).map((event) => (
                <MiniCard key={event.id} event={event} />
              ))}
            </ul>
          ) : (
            <EmptyHint>Здесь появятся события, которые вы открывали</EmptyHint>
          )}
        </section>
      </div>
    </aside>
  )
}
