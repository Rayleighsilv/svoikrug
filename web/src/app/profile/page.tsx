'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'

type EventItem = {
  id: string
  hostId: string
  title: string
  status: string
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
  const { user, loading, logout, refreshUser } = useAuth()
  const router = useRouter()

  const [myEvents, setMyEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [district, setDistrict] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [myRsvps, setMyRsvps] = useState<RsvpItem[]>([])
  const [rsvpsScope, setRsvpsScope] = useState<'upcoming' | 'past'>('upcoming')
  const [rsvpsLoading, setRsvpsLoading] = useState(true)
  const [rsvpsError, setRsvpsError] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

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
      .then((data) => {
        if (!cancelled) setMyRsvps(data.rsvps || [])
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

  const handleLogout = async () => {
    await logout()
    router.replace('/')
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
    setSaving(true)
    setSaveError('')
    try {
      await api.patch('/users/me/profile', { nickname: nick, bio, district })
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Загрузка...</p>
      </main>
    )
  }

  // После загрузки сессии пользователя нет — редиректим (см. useEffect).
  if (!user) {
    return null
  }

  const initial = (user.profile?.nickname || user.email || '?').charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Шапка: заголовок + действия */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Профиль</h1>
          <div className="flex gap-3">
            <NotificationBell />
            <Link
              href="/events/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Создать событие
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Карточка профиля */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              {user.profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile.avatarUrl}
                  alt="Аватар"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl font-bold text-white">
                  {initial}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{user.profile?.nickname || 'Без имени'}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm shrink-0"
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
