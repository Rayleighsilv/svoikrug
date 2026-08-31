'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type EventDetail = {
  id: string
  hostId: string
  title: string
  description?: string | null
  theme?: string | null
  startsAt: string
  maxGuests?: number | null
  status: string
  rules?: unknown
  lat?: number | null
  lng?: number | null
  host: {
    id: string
    email: string
    profile?: {
      nickname?: string | null
      bio?: string | null
      district?: string | null
      trustScore: number
      isVerified: boolean
    } | null
  }
  _count: { guests: number }
}

type GuestItem = {
  id: string
  userId: string
  status: string
  user: {
    id: string
    profile?: { nickname?: string | null; avatarUrl?: string | null } | null
  }
}

const RSVP_ERRORS: Record<string, string> = {
  ALREADY_JOINED: 'Вы уже записаны на это событие.',
  EVENT_FULL: 'Свободных мест больше нет.',
  EVENT_NOT_PUBLISHED: 'Событие ещё не открыто для записи.',
  CANNOT_JOIN_OWN_EVENT: 'Нельзя записаться на своё событие.',
  NOT_A_GUEST: 'Вы не записаны на это событие.',
}
const DEFAULT_RSVP_ERROR = 'Не удалось обработать запись. Попробуйте ещё раз.'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Открыт для записи', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Запись закрыта', className: 'bg-gray-200 text-gray-700' },
  archived: { label: 'В архиве', className: 'bg-gray-600 text-white' },
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const id = params.id

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [guests, setGuests] = useState<GuestItem[]>([])
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState('')

  // Загружаем событие и список гостей; loading держим до завершения обоих.
  useEffect(() => {
    let cancelled = false
    let pending = 2
    const done = () => {
      if (cancelled) return
      pending -= 1
      if (pending === 0) setLoading(false)
    }

    api
      .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
      .then((data) => {
        if (cancelled) return
        setEvent(data.event)
        setGuestCount(data.event._count.guests)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(done)

    api
      .get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
      .then((data) => {
        if (cancelled) return
        const list = data.guests || []
        setGuests(list)
        setGuestCount(list.length)
      })
      .catch(() => {
        if (!cancelled) setGuests([])
      })
      .finally(done)

    return () => {
      cancelled = true
    }
  }, [id])

  const signedUp = !!(user && guests.some((g) => g.userId === user.id))
  const isHost = !!(user && event && user.id === event.hostId)
  const isPublished = event?.status === 'published'
  const isFull = !!(event && event.maxGuests != null && guestCount >= event.maxGuests)

  const refetchGuests = async () => {
    const data = await api.get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
    const list = data.guests || []
    setGuests(list)
    setGuestCount(list.length)
  }

  const handleJoin = async () => {
    if (!user) {
      router.replace(`/login?from=/events/${id}`)
      return
    }
    setRsvpSubmitting(true)
    setRsvpError('')
    try {
      await api.post(`/events/${id}/rsvp`)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      setRsvpError(e.code ? (RSVP_ERRORS[e.code] ?? DEFAULT_RSVP_ERROR) : DEFAULT_RSVP_ERROR)
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setRsvpSubmitting(true)
    setRsvpError('')
    try {
      await api.delete(`/events/${id}/rsvp`)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      setRsvpError(e.code ? (RSVP_ERRORS[e.code] ?? DEFAULT_RSVP_ERROR) : DEFAULT_RSVP_ERROR)
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleStatusChange = async (nextStatus: string) => {
    setStatusSubmitting(true)
    setStatusError('')
    try {
      const response = await api.patch<{ success: boolean; event: { status: string } }>(
        `/events/${id}`,
        { status: nextStatus },
      )
      // Обновляем только статус, сохраняя остальные данные события.
      setEvent((prev) => (prev ? { ...prev, status: response.event.status } : prev))
    } catch (err) {
      const e = (err || {}) as { message?: string }
      setStatusError(e.message || 'Не удалось изменить статус события')
    } finally {
      setStatusSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    if (!window.confirm('Удалить это событие?')) return
    try {
      await api.delete(`/events/${event.id}`)
      router.replace('/')
    } catch {
      alert('Не удалось удалить событие')
    }
  }

  const renderRules = () => {
    if (event?.rules == null) return null
    const rules = event.rules
    if (typeof rules === 'string') return <p>{rules}</p>
    if (Array.isArray(rules)) {
      return (
        <ul className="list-disc pl-5">
          {rules.map((r, i) => (
            <li key={i}>{String(r)}</li>
          ))}
        </ul>
      )
    }
    if (typeof rules === 'object') {
      return (
        <ul className="list-disc pl-5">
          {Object.entries(rules as Record<string, unknown>).map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {String(v)}
            </li>
          ))}
        </ul>
      )
    }
    return <pre>{JSON.stringify(rules, null, 2)}</pre>
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Загрузка...</p>
      </main>
    )
  }

  if (notFound || !event) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Событие не найдено</h1>
          <button
            onClick={() => router.replace('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Назад к событиям
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.replace('/')} className="mb-4 text-blue-600 hover:underline">
          ← Назад к событиям
        </button>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                (STATUS_BADGE[event.status] || STATUS_BADGE.draft).className
              }`}
            >
              {(STATUS_BADGE[event.status] || STATUS_BADGE.draft).label}
            </span>
          </div>
          {event.theme && <p className="text-sm text-gray-500 mb-2">Тема: {event.theme}</p>}
          <p className="text-gray-700">🕒 {formatDate(event.startsAt)}</p>
          {event.description && (
            <p className="mt-4 text-gray-700 whitespace-pre-line">{event.description}</p>
          )}
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Организатор</h2>
          <p className="text-gray-700 font-medium">{event.host.profile?.nickname || 'Без имени'}</p>
          {event.host.email && <p className="text-sm text-gray-500">{event.host.email}</p>}
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Гости</h2>
          <p className="text-gray-700 mb-4">
            {event.maxGuests != null
              ? `Записалось: ${guestCount} из ${event.maxGuests}`
              : `Записалось: ${guestCount}`}
          </p>

          {guests.length === 0 ? (
            <p className="text-gray-600">Пока никто не записался</p>
          ) : (
            <ul className="space-y-3">
              {guests.map((g) => {
                const nickname = g.user.profile?.nickname || 'Без имени'
                const initial = nickname.charAt(0).toUpperCase() || '?'
                return (
                  <li key={g.id} className="flex items-center gap-3">
                    {g.user.profile?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.user.profile.avatarUrl}
                        alt={nickname}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                        {initial}
                      </div>
                    )}
                    <span className="text-gray-800 font-medium">{nickname}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {event.rules != null && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Правила дома</h2>
            <div className="text-gray-700">{renderRules()}</div>
          </div>
        )}

        {(event.lat != null || event.lng != null) && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Локация</h2>
            <p className="text-gray-700">
              {event.lat != null && `Широта: ${event.lat}`}
              {event.lat != null && event.lng != null && ', '}
              {event.lng != null && `Долгота: ${event.lng}`}
            </p>
          </div>
        )}

        {statusError && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">{statusError}</div>
        )}

        {rsvpError && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">{rsvpError}</div>
        )}

        {!authLoading && (
          <div className="mt-8 flex gap-3">
            {isHost ? (
              <>
                <button
                  onClick={() => router.replace(`/events/edit/${event.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Редактировать
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Удалить
                </button>
                {event.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Публикуем...' : 'Опубликовать'}
                  </button>
                )}
                {event.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Закрываем...' : 'Закрыть запись'}
                  </button>
                )}
                {event.status === 'closed' && (
                  <button
                    onClick={() => handleStatusChange('archived')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Архивируем...' : 'В архив'}
                  </button>
                )}
                {event.status === 'archived' && (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-white self-center">
                    В архиве
                  </span>
                )}
              </>
            ) : !isPublished ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed"
              >
                Событие ещё не открыто для записи
              </button>
            ) : isFull ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed"
              >
                Мест нет
              </button>
            ) : signedUp ? (
              <button
                onClick={handleCancel}
                disabled={rsvpSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
              >
                {rsvpSubmitting ? 'Отменяем...' : 'Отменить запись'}
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={rsvpSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              >
                {rsvpSubmitting ? 'Записываемся...' : 'Записаться'}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
