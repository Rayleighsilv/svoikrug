'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import EventImage from '@/components/EventImage'
import FavoriteButton from '@/components/FavoriteButton'
import { formatDateTime } from '@/lib/date'
import {
  getSavedEvents,
  subscribeToEventHistory,
  type StoredEvent,
} from '@/lib/eventHistory'
import { FORMAT_BY_SLUG, findSubcategory } from '@/lib/formats'

/** Иконка «Избранное» в шапке: счётчик и окно со списком событий. */
export default function FavoritesButton() {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<StoredEvent[]>([])

  useEffect(() => {
    const sync = () => setEvents(getSavedEvents())
    sync()
    return subscribeToEventHistory(sync)
  }, [])

  // Закрываем при переходе на другую страницу.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Избранное${events.length > 0 ? `: ${events.length}` : ''}`}
        title="Избранное"
        className={`relative rounded-full p-2 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          open ? 'bg-gray-100 text-red-500' : 'text-gray-400 hover:text-red-500'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
        {events.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {events.length > 99 ? '99+' : events.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Избранные события"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Избранное</h2>
            <span className="text-xs text-gray-500">{events.length}</span>
          </div>

          {events.length > 0 ? (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {events.map((event) => {
                const format = FORMAT_BY_SLUG[event.format ?? 'offline']
                const subcategory = findSubcategory(event.subcategory)
                return (
                  <li
                    key={event.id}
                    className="relative flex items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50"
                  >
                    <EventImage
                      src={event.coverImageUrl}
                      alt={`Фото события: ${event.title}`}
                      fallback={{
                        emoji: subcategory?.emoji ?? format.emoji,
                        gradient: format.gradient,
                      }}
                      className="h-12 w-12 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(event.startsAt)}
                        {event.city ? ` · ${event.city}` : ''}
                      </p>
                    </div>
                    <FavoriteButton event={event} className="relative z-10 shrink-0" />
                    <Link
                      href={`/events/${event.id}`}
                      aria-label={`Открыть событие «${event.title}»`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              Пока пусто — добавляйте события сердечком ♡
            </p>
          )}
        </div>
      )}
    </div>
  )
}
