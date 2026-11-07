'use client'

import { useEffect, useState } from 'react'
import {
  isEventSaved,
  subscribeToEventHistory,
  toggleSavedEvent,
  type StoredEvent,
} from '@/lib/eventHistory'

/**
 * Сердечко «в избранное». Состояние читается из localStorage и
 * синхронизируется между всеми карточками и шапкой.
 */
export default function FavoriteButton({
  event,
  className = '',
}: {
  event: StoredEvent
  className?: string
}) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const sync = () => setSaved(isEventSaved(event.id))
    sync()
    return subscribeToEventHistory(sync)
  }, [event.id])

  const handleClick = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
    // Карточка обёрнута ссылкой — не даём ей сработать.
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    setSaved(toggleSavedEvent(event))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Убрать «${event.title}» из избранного` : `Добавить «${event.title}» в избранное`}
      title={saved ? 'Убрать из избранного' : 'В избранное'}
      className={`rounded-full p-1.5 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        saved ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  )
}
