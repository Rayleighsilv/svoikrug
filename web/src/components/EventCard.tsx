'use client'

import Link from 'next/link'
import Avatar from '@/components/Avatar'
import EventImage from '@/components/EventImage'
import FavoriteButton from '@/components/FavoriteButton'
import { formatEventDateTime } from '@/lib/date'
import { FORMAT_BY_SLUG, findSubcategory, type EventFormat } from '@/lib/formats'
import { reviewsWord } from '@/lib/reviews'
import type { Tag } from '@/lib/tags'

export type EventCardEvent = {
  id: string
  title: string
  theme?: string | null
  format?: EventFormat | null
  subcategory?: string | null
  city?: string | null
  participantGeo?: 'any' | 'city' | null
  addressPublic?: string | null
  coverImageUrl?: string | null
  startsAt: string
  maxGuests?: number | null
  tags?: Tag[]
  host: {
    id: string
    profile?: { nickname: string; avatarUrl?: string | null; trustScore: number } | null
    _count?: { ratingsReceived: number }
  }
  _count: { guests: number }
}

export default function EventCard({
  event,
  href,
}: {
  event: EventCardEvent
  href?: string | null
}) {
  const subcategory = findSubcategory(event.subcategory)
  const formatMeta = FORMAT_BY_SLUG[event.format ?? 'offline']
  const themeLabel = subcategory?.label ?? event.theme
  const reviews = event.host._count?.ratingsReceived ?? 0
  const score = event.host.profile?.trustScore ?? 0
  const isOnline = event.format === 'online'
  // «Онлайн · любой город» или «Онлайн · Москва».
  const geoLabel =
    event.participantGeo === 'city' && event.city ? event.city : 'любой город'

  return (
    <li className="relative flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:flex-row">
      <EventImage
        src={event.coverImageUrl}
        alt={`Фото места: ${event.title}`}
        fallback={{
          emoji: subcategory?.emoji ?? formatMeta.emoji,
          gradient: formatMeta.gradient,
        }}
        className="h-44 w-full shrink-0 rounded-xl sm:h-36 sm:w-48"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {formatMeta.emoji}{' '}
            {isOnline ? `${formatMeta.shortLabel} · ${geoLabel}` : formatMeta.shortLabel}
          </span>
        </div>
        {themeLabel && <p className="mt-0.5 text-sm text-gray-500">Тема: {themeLabel}</p>}
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          {isOnline
            ? event.city && <p>🏡 Хост из {event.city}</p>
            : event.city && <p>📍 {event.city}</p>}
          {!isOnline && event.addressPublic && <p>🏠 {event.addressPublic}</p>}
          <p>🕒 {formatEventDateTime(event.startsAt)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {event.maxGuests != null ? (
              <>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((event._count.guests / event.maxGuests) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {event._count.guests} из {event.maxGuests}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">Без ограничения мест</span>
            )}
          </div>
        </div>
        {event.tags && event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag.slug}
                className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-3 border-t border-gray-100 pt-3 sm:w-44 sm:flex-col sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <Avatar
          url={event.host.profile?.avatarUrl}
          name={event.host.profile?.nickname}
          size="w-12 h-12"
        />
        <div className="min-w-0">
          <Link
            href={`/users/${event.host.id}`}
            className="relative z-10 block truncate font-medium text-blue-600 hover:underline"
          >
            {event.host.profile?.nickname || 'Без имени'}
          </Link>
          <div className="mt-1 text-sm">
            {reviews > 0 ? (
              <span className="flex flex-wrap items-center gap-1">
                <span className="text-amber-500" aria-hidden="true">
                  ★
                </span>
                <span className="font-semibold text-gray-900">{score.toFixed(1)}</span>
                <span className="text-gray-500">
                  · {reviews} {reviewsWord(reviews)}
                </span>
              </span>
            ) : (
              <span className="text-gray-400">Нет отзывов</span>
            )}
          </div>
        </div>
      </div>

      <FavoriteButton
        event={{
          id: event.id,
          title: event.title,
          coverImageUrl: event.coverImageUrl,
          theme: event.theme,
          subcategory: event.subcategory,
          format: event.format,
          city: event.city,
          startsAt: event.startsAt,
          hostName: event.host.profile?.nickname ?? null,
        }}
        className="absolute right-3 top-3 z-10 bg-white/90 shadow-sm backdrop-blur"
      />

      {href !== null && (
        <Link
          href={href ?? `/events/${event.id}`}
          aria-label={`Открыть событие «${event.title}»`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      )}
    </li>
  )
}
