'use client'

import Link from 'next/link'

export type ProfileEventItem = {
  id: string
  title: string
  theme?: string | null
  city?: string | null
  startsAt: string
  status: string
  guests?: number
  maxGuests?: number | null
  origin: 'hosted' | 'attended'
  rsvp?: { id: string; eventId: string; status: string }
}

type Mode = 'hosted' | 'going' | 'archive'

const THEME_STYLE: Record<string, { emoji: string; className: string }> = {
  Кино: { emoji: '🎬', className: 'bg-indigo-100 text-indigo-700' },
  Настолки: { emoji: '🎲', className: 'bg-amber-100 text-amber-700' },
  Музыка: { emoji: '🎸', className: 'bg-pink-100 text-pink-700' },
  'Книжный клуб': { emoji: '📚', className: 'bg-emerald-100 text-emerald-700' },
  'Мастер-класс': { emoji: '🎨', className: 'bg-purple-100 text-purple-700' },
  Другое: { emoji: '✨', className: 'bg-gray-100 text-gray-700' },
}

const DEFAULT_STYLE = { emoji: '🎉', className: 'bg-blue-100 text-blue-700' }

function formatDate(iso: string): string {
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

export default function ProfileEventCard({
  item,
  mode,
  onCancel,
  canceling = false,
}: {
  item: ProfileEventItem
  mode: Mode
  onCancel?: (rsvpId: string, eventId: string) => void
  canceling?: boolean
}) {
  const style = THEME_STYLE[item.theme || ''] || DEFAULT_STYLE
  const pending = item.rsvp?.status === 'pending'
  const canCancel =
    mode === 'going' &&
    !!onCancel &&
    !!item.rsvp &&
    (item.rsvp.status === 'pending' || item.rsvp.status === 'approved') &&
    item.status === 'published'

  const originLabel =
    item.origin === 'hosted'
      ? mode === 'archive'
        ? 'Вы организовали'
        : 'Вы организуете'
      : mode === 'archive'
        ? 'Вы сходили'
        : 'Вы идёте'

  return (
    <li className="relative flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-3xl ${style.className}`}
      >
        {style.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-gray-900">{item.title}</h3>
          {pending && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Заявка на рассмотрении
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">🕒 {formatDate(item.startsAt)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {item.city && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              📍 {item.city}
            </span>
          )}
          <span>{originLabel}</span>
          {item.guests != null && (
            <span>
              Гостей: {item.guests}
              {item.maxGuests != null ? ` / ${item.maxGuests}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {canCancel && item.rsvp && (
          <button
            type="button"
            onClick={() => onCancel?.(item.rsvp!.id, item.rsvp!.eventId)}
            disabled={canceling}
            className="relative z-10 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {canceling ? '...' : 'Отменить'}
          </button>
        )}
        <span className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">
          Открыть
        </span>
      </div>

      <Link
        href={`/events/${item.id}`}
        aria-label={`Открыть событие «${item.title}»`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />
    </li>
  )
}
