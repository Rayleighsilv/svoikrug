'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Header from '@/components/Header'
import ProfileAvatar from '@/components/ProfileAvatar'
import CityInput from '@/components/CityInput'

type EventItem = {
  id: string
  hostId: string
  title: string
  status: string
  city?: string | null
  startsAt: string
  maxGuests?: number | null
  _count: { guests: number }
}

type RsvpItem = {
  id: string
  eventId: string
  userId: string
  status: string
  joinedAt: string
  event: {
    id: string
    title: string
    theme?: string | null
    city?: string | null
    startsAt: string
    status: string
    maxGuests?: number | null
    host: { id: string; profile?: { nickname: string } | null }
    _count: { guests: number }
  }
}

function formatDate(iso: string): string {
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

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth()
  const router = useRouter()

  const [myEvents, setMyEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [district, setDistrict] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [myRsvps, setMyRsvps] = useState<RsvpItem[]>([])
  const [rsvpsScope, setRsvpsScope] = useState<'upcoming' | 'past'>('upcoming')
  const [rsvpsLoading, setRsvpsLoading] = useState(true)
  const [rsvpsError, setRsvpsError] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Middleware уже должен отсечь гостей, но подстраховываемся в UI.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?from=/profile')
    }
  }, [loading, user, router])

  // Загружаем события и фильтруем по hostId на клиенте (бэк не поддерживает ?hostId=).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .get<{ success: boolean; events: EventItem[] }>('/events')
      .then((data) => {
        if (!cancelled) {
          const hosted = (data.events || []).filter((e) => e.hostId === user.id)
          setMyEvents(hosted)
        }
      })
      .catch((err) => {
        console.error('Ошибка загрузки событий:', err)
        if (!cancelled) setMyEvents([])
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // Загружаем «Мои записи» (upcoming/past).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRsvpsLoading(true)
    setRsvpsError('')
    api
      .get<{ success: boolean; rsvps: RsvpItem[] }>(`/users/me/rsvps?scope=${rsvpsScope}`)
      .then(async (data) => {
        const rsvps = data.rsvps || []
        if (cancelled) return
        // В ответе RSVP нет города события — добираем его из деталей события.
        const ids = Array.from(new Set(rsvps.map((r) => r.eventId)))
        const cities = await Promise.all(
          ids.map(async (eventId) => {
            try {
              const detail = await api.get<{
                success: boolean
                event: { city?: string | null }
              }>(`/events/${eventId}`)
              return [eventId, detail.event.city ?? null] as const
            } catch {
              return [eventId, null] as const
            }
          }),
        )
        if (cancelled) return
        const cityById = new Map(cities)
        setMyRsvps(
          rsvps.map((r) => ({
            ...r,
            event: { ...r.event, city: cityById.get(r.eventId) ?? null },
          })),
        )
      })
      .catch((err) => {
        console.error('Ошибка загрузки записей:', err)
        if (!cancelled) setRsvpsError('Не удалось загрузить записи. Попробуйте позже.')
      })
      .finally(() => {
        if (!cancelled) setRsvpsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, rsvpsScope])

  // Показываем галочку «скопировано» пару секунд.
  useEffect(() => {
    if (!copiedEmail) return
    const timer = setTimeout(() => setCopiedEmail(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedEmail])

  const handleCopyEmail = async () => {
    if (!user || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(user.email)
      setCopiedEmail(true)
    } catch {
      // clipboard может быть недоступен — молча игнорируем
    }
  }

  const handleCancelRsvp = async (rsvp: RsvpItem) => {
    setCancelingId(rsvp.id)
    setRsvpsError('')
    try {
      await api.delete(`/events/${rsvp.eventId}/rsvp`)
      setMyRsvps((prev) => prev.filter((r) => r.id !== rsvp.id))
    } catch {
      setRsvpsError('Не удалось отменить запись. Попробуйте позже.')
    } finally {
      setCancelingId(null)
    }
  }

  const startEditing = () => {
    setNickname(user?.profile?.nickname || '')
    setBio(user?.profile?.bio || '')
    setDistrict(user?.profile?.district || '')
    setProfileCity(user?.profile?.city || '')
    setSaveError('')
    setEditing(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const nick = nickname.trim()
    if (nick.length < 2 || nick.length > 30) {
      setSaveError('Никнейм должен содержать от 2 до 30 символов')
      return
    }
    if (!/^[a-zA-Zа-яА-Я0-9_-]+$/.test(nick)) {
      setSaveError('Ник может содержать только буквы, цифры, дефис и подчёркивание')
      return
    }
    const cityValue = profileCity.trim()
    if (cityValue && (cityValue.length < 2 || cityValue.length > 50)) {
      setSaveError('Город должен содержать от 2 до 50 символов')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await api.patch('/users/me/profile', { nickname: nick, bio, district, city: cityValue })
      await refreshUser()
      setEditing(false)
    } catch (err) {
      const errObj = (err || {}) as {
        code?: string
        message?: string
        details?: Array<{ field?: string; message?: string }>
      }
      if (errObj.code === 'NICKNAME_TAKEN') {
        setSaveError('Этот ник уже занят')
      } else if (errObj.code === 'VALIDATION_ERROR' && errObj.details?.[0]?.message) {
        setSaveError(errObj.details[0].message)
      } else {
        setSaveError(errObj.message || 'Не удалось сохранить профиль')
      }
    } finally {
      setSaving(false)
    }
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

  // После загрузки сессии пользователя нет — редиректим (см. useEffect).
  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          К событиям
        </Link>

        <h1 className="mb-8 text-2xl font-bold">Профиль</h1>

        {/* Карточка профиля */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileAvatar url={user.profile?.avatarUrl} name={user.profile?.nickname} />
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">
                  {user.profile?.nickname || 'Без имени'}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <span className="truncate">{user.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    aria-label={copiedEmail ? 'Email скопирован' : 'Скопировать email'}
                    title={copiedEmail ? 'Скопировано' : 'Скопировать email'}
                    className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {copiedEmail ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                {user.profile?.city && (
                  <p className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      📍 {user.profile.city}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="self-start rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700"
              >
                Редактировать профиль
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{saveError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-nickname">
                  Никнейм
                </label>
                <input
                  id="edit-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-bio">
                  Био
                </label>
                <textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-district">
                  Район
                </label>
                <input
                  id="edit-district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  maxLength={100}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-city">
                  Город
                </label>
                <CityInput
                  id="edit-city"
                  value={profileCity}
                  onChange={setProfileCity}
                  placeholder="Например: Москва"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-2 text-sm">
            {user.profile?.bio && (
              <div>
                <dt className="font-medium text-gray-600">Bio</dt>
                <dd className="text-gray-800 whitespace-pre-line">{user.profile.bio}</dd>
              </div>
            )}
            {user.profile?.district && (
              <div>
                <dt className="font-medium text-gray-600">Район</dt>
                <dd className="text-gray-800">{user.profile.district}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-600">Trust Score</dt>
              <dd className="text-gray-800">{user.profile?.trustScore ?? 0}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Верификация</dt>
              <dd className="text-gray-800">
                {user.profile?.isVerified ? 'Верифицирован' : 'Не верифицирован'}
              </dd>
            </div>
          </dl>
          )}
        </div>

        {/* Мои события */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Мои события</h2>

          {eventsLoading ? (
            <p className="text-gray-600">Загрузка событий...</p>
          ) : myEvents.length === 0 ? (
            <p className="text-gray-600">Вы ещё не создали ни одного события</p>
          ) : (
            <ul className="space-y-3">
              {myEvents.map((ev) => (
                <li key={ev.id}>
                  <Link
                    href={`/events/${ev.id}`}
                    className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition text-gray-900"
                  >
                    <div className="font-semibold">{ev.title}</div>
                    <div className="text-sm text-gray-600">🕒 {formatDate(ev.startsAt)}</div>
                    {ev.city && <div className="text-sm text-gray-600">📍 {ev.city}</div>}
                    <div className="text-sm text-gray-600">Статус: {ev.status}</div>
                    <div className="text-sm text-gray-600">
                      Гостей: {ev._count.guests}
                      {ev.maxGuests != null ? ` / ${ev.maxGuests}` : ''}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Я иду */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Я иду</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setRsvpsScope('upcoming')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  rsvpsScope === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 shadow'
                }`}
              >
                Предстоящие
              </button>
              <button
                onClick={() => setRsvpsScope('past')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  rsvpsScope === 'past' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 shadow'
                }`}
              >
                Прошедшие
              </button>
            </div>
          </div>

          {rsvpsLoading ? (
            <p className="text-gray-600">Загрузка записей...</p>
          ) : rsvpsError ? (
            <p className="text-red-600">{rsvpsError}</p>
          ) : myRsvps.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-lg shadow">
              <p className="text-gray-600">Вы пока ни на что не записаны</p>
              <Link href="/" className="mt-3 inline-block text-blue-600 hover:underline">
                Смотреть события
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {myRsvps.map((r) => {
                const canCancel =
                  rsvpsScope === 'upcoming' && r.event.status === 'published' && r.status === 'approved'
                const badge = r.status === 'attended' ? 'Присутствовал' : 'Записан'
                return (
                  <li key={r.id} className="p-4 bg-white rounded-lg shadow">
                    <Link
                      href={`/events/${r.event.id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {r.event.title}
                    </Link>
                    <div className="text-sm text-gray-600 mt-1">🕒 {formatDate(r.event.startsAt)}</div>
                    {r.event.city && <div className="text-sm text-gray-600">📍 {r.event.city}</div>}
                    <div className="text-sm text-gray-600">
                      Хост:{' '}
                      <Link
                        href={`/users/${r.event.host.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.event.host.profile?.nickname || 'Без имени'}
                      </Link>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {badge}
                      </span>
                      {canCancel && (
                        <button
                          onClick={() => handleCancelRsvp(r)}
                          disabled={cancelingId === r.id}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60"
                        >
                          {cancelingId === r.id ? 'Отменяем...' : 'Отменить запись'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
      <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
