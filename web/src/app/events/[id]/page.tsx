'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'
import Header from '@/components/Header'

type EventDetail = {
  id: string
  hostId: string
  title: string
  description?: string | null
  theme?: string | null
  city?: string | null
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
      avatarUrl?: string | null
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
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [reviewingGuestId, setReviewingGuestId] = useState<string | null>(null)
  const [guestReviewError, setGuestReviewError] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [ratedUsers, setRatedUsers] = useState<Set<string>>(new Set())
  const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null)
  const [ratingError, setRatingError] = useState('')

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
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(done)

    api
      .get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
      .then((data) => {
        if (cancelled) return
        setGuests(data.guests || [])
      })
      .catch(() => {
        if (!cancelled) setGuests([])
      })
      .finally(done)

    return () => {
      cancelled = true
    }
  }, [id])

  const activeGuests = guests.filter((g) =>
    ['pending', 'approved', 'attended'].includes(g.status),
  )
  const confirmedGuests = guests.filter(
    (g) => g.status === 'approved' || g.status === 'attended',
  )
  const pendingGuests = guests.filter((g) => g.status === 'pending')

  const signedUp = !!(user && guests.some((g) => g.userId === user.id))
  const isHost = !!(user && event && user.id === event.hostId)
  const isPublished = event?.status === 'published'
  const isFull = !!(event && event.maxGuests != null && activeGuests.length >= event.maxGuests)

  const myGuest = user ? guests.find((g) => g.userId === user.id) : null
  const iAttended = myGuest?.status === 'attended'
  const rateable = guests.filter((g) => g.status === 'attended' && g.userId !== user?.id)
  const cancelLabel =
    myGuest?.status === 'pending'
      ? 'Отменить заявку'
      : myGuest?.status === 'rejected'
        ? 'Убрать заявку'
        : 'Отменить запись'

  const refetchGuests = async () => {
    const data = await api.get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
    setGuests(data.guests || [])
  }

  const handleReviewGuest = async (guestUserId: string, action: 'approve' | 'reject') => {
    setReviewingGuestId(guestUserId)
    setGuestReviewError('')
    try {
      await api.post(`/events/${id}/guests/${guestUserId}/${action}`)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      const map: Record<string, string> = {
        EVENT_FULL: 'Свободных мест больше нет',
        NOT_A_GUEST: 'Заявка уже неактуальна',
        REQUEST_ALREADY_REVIEWED: 'Заявка уже обработана',
        ACCESS_DENIED: 'Нет доступа',
      }
      setGuestReviewError(
        e.code ? map[e.code] || 'Не удалось обработать заявку' : 'Не удалось обработать заявку',
      )
    } finally {
      setReviewingGuestId(null)
    }
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

  const handleAttendance = async (userId: string, checked: boolean) => {
    if (!event) return
    setAttendanceSubmitting(true)
    setAttendanceError('')
    const current = new Set(guests.filter((g) => g.status === 'attended').map((g) => g.userId))
    if (checked) {
      current.add(userId)
    } else {
      current.delete(userId)
    }
    try {
      const res = await api.post<{ success: boolean; guests: GuestItem[] }>(
        `/events/${event.id}/mark-attendance`,
        { userIds: Array.from(current) },
      )
      setGuests(res.guests || [])
    } catch (err) {
      const e = (err || {}) as { message?: string }
      setAttendanceError(e.message || 'Не удалось обновить посещаемость')
    } finally {
      setAttendanceSubmitting(false)
    }
  }

  const handleRate = async (userId: string) => {
    if (!event) return
    const score = scores[userId]
    if (!score) {
      setRatingError('Выберите оценку')
      return
    }
    setRatingSubmitting(userId)
    setRatingError('')
    try {
      await api.post(`/events/${event.id}/ratings`, {
        ratedUserId: userId,
        score,
        comment: comments[userId]?.trim() || undefined,
      })
      setRatedUsers((prev) => new Set(prev).add(userId))
    } catch (err) {
      const e = (err || {}) as { code?: string }
      const map: Record<string, string> = {
        CANNOT_RATE_SELF: 'Нельзя оценить себя.',
        NOT_A_GUEST: 'Этот участник не был гостем, или вы не были гостем события.',
        ALREADY_RATED: 'Вы уже оценили этого участника.',
        EVENT_NOT_CLOSED: 'Событие ещё не закрыто для оценок.',
      }
      if (e.code === 'ALREADY_RATED') {
        setRatedUsers((prev) => new Set(prev).add(userId))
      }
      setRatingError(e.code ? (map[e.code] || 'Не удалось отправить оценку') : 'Не удалось отправить оценку')
    } finally {
      setRatingSubmitting(null)
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
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </main>
    )
  }

  if (notFound || !event) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Событие не найдено</h1>
            <button
              onClick={() => router.replace('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Назад к событиям
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
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
          {event.city && (
            <p className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                📍 {event.city}
              </span>
            </p>
          )}
          <p className="text-gray-700">🕒 {formatDate(event.startsAt)}</p>
          {event.description && (
            <p className="mt-4 text-gray-700 whitespace-pre-line">{event.description}</p>
          )}
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Организатор</h2>
          <div className="flex items-center gap-3">
            <Avatar url={event.host.profile?.avatarUrl} name={event.host.profile?.nickname} />
            <p className="text-gray-700 font-medium">
              <Link href={`/users/${event.host.id}`} className="text-blue-600 hover:underline">
                {event.host.profile?.nickname || 'Без имени'}
              </Link>
            </p>
          </div>
          {event.host.email && <p className="text-sm text-gray-500">{event.host.email}</p>}
        </div>

        {isHost && pendingGuests.length > 0 && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Заявки на участие</h2>
            {guestReviewError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">
                {guestReviewError}
              </div>
            )}
            <ul className="space-y-3">
              {pendingGuests.map((g) => {
                const nickname = g.user.profile?.nickname || 'Без имени'
                return (
                  <li key={g.id} className="flex flex-wrap items-center gap-3">
                    <Avatar url={g.user.profile?.avatarUrl} name={nickname} />
                    <Link href={`/users/${g.userId}`} className="font-medium text-blue-600 hover:underline">
                      {nickname}
                    </Link>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => handleReviewGuest(g.userId, 'approve')}
                        disabled={reviewingGuestId === g.userId}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60"
                      >
                        {reviewingGuestId === g.userId ? '...' : 'Принять'}
                      </button>
                      <button
                        onClick={() => handleReviewGuest(g.userId, 'reject')}
                        disabled={reviewingGuestId === g.userId}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        Отклонить
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Гости</h2>
          <p className="text-gray-700 mb-4">
            {event.maxGuests != null
              ? `Записалось: ${confirmedGuests.length} из ${event.maxGuests}`
              : `Записалось: ${confirmedGuests.length}`}
          </p>

          {confirmedGuests.length === 0 ? (
            <p className="text-gray-600">Пока никто не записался</p>
          ) : (
            <ul className="space-y-3">
              {confirmedGuests.map((g) => {
                const nickname = g.user.profile?.nickname || 'Без имени'
                return (
                  <li key={g.id} className="flex items-center gap-3">
                    <Avatar url={g.user.profile?.avatarUrl} name={nickname} />
                    <Link href={`/users/${g.userId}`} className="text-blue-600 hover:underline">
                      {nickname}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {isHost && (event.status === 'closed' || event.status === 'archived') && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Отметить присутствующих</h2>
            {attendanceError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">{attendanceError}</div>
            )}
            {confirmedGuests.length === 0 ? (
              <p className="text-gray-600">Нет записавшихся гостей</p>
            ) : (
              <ul className="space-y-2">
                {confirmedGuests.map((g) => {
                  const nickname = g.user.profile?.nickname || 'Без имени'
                  return (
                    <li key={g.id}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={g.status === 'attended'}
                          disabled={attendanceSubmitting}
                          onChange={(e) => handleAttendance(g.userId, e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{nickname}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {(event.status === 'closed' || event.status === 'archived') && iAttended && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Оценить участников</h2>
            {ratingError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">{ratingError}</div>
            )}
            {rateable.length === 0 ? (
              <p className="text-gray-600">Нет участников для оценки</p>
            ) : rateable.every((g) => ratedUsers.has(g.userId)) ? (
              <p className="text-gray-600">Вы оценили всех участников</p>
            ) : (
              <ul className="space-y-4">
                {rateable.map((g) => {
                  const nickname = g.user.profile?.nickname || 'Без имени'
                  const isRated = ratedUsers.has(g.userId)
                  const isSubmitting = ratingSubmitting === g.userId
                  return (
                    <li key={g.id}>
                      <div className="flex items-center gap-3">
                        <Link href={`/users/${g.userId}`} className="flex items-center gap-3 text-blue-600 hover:underline">
                          <Avatar url={g.user.profile?.avatarUrl} name={nickname} size="w-9 h-9" />
                          <span className="font-medium">{nickname}</span>
                        </Link>
                        {isRated ? (
                          <span className="text-sm text-green-600 font-medium">Оценён</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <select
                              value={scores[g.userId] || 0}
                              onChange={(e) => setScores((prev) => ({ ...prev, [g.userId]: Number(e.target.value) }))}
                              className="p-1 border rounded text-sm"
                              disabled={isSubmitting}
                            >
                              <option value={0} disabled>
                                Оценка
                              </option>
                              {[1, 2, 3, 4, 5].map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={comments[g.userId] || ''}
                              onChange={(e) => setComments((prev) => ({ ...prev, [g.userId]: e.target.value }))}
                              placeholder="Комментарий (необязательно)"
                              className="p-1 border rounded text-sm flex-1"
                              disabled={isSubmitting}
                            />
                            <button
                              onClick={() => handleRate(g.userId)}
                              disabled={isSubmitting || !scores[g.userId]}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-60"
                            >
                              {isSubmitting ? 'Отправляем...' : 'Оценить'}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

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

        {!isHost && myGuest?.status === 'pending' && (
          <div className="mt-6 p-3 bg-amber-50 text-amber-800 text-sm rounded">
            Заявка на рассмотрении у организатора.
          </div>
        )}
        {!isHost && myGuest?.status === 'rejected' && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">
            Организатор отклонил заявку. Можно убрать её и отправить новую.
          </div>
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
                {rsvpSubmitting ? 'Отменяем...' : cancelLabel}
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={rsvpSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              >
                {rsvpSubmitting ? 'Отправляем...' : 'Хочу пойти'}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
