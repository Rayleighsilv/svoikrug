'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Header from '@/components/Header'
import ProfileAvatar from '@/components/ProfileAvatar'
import CityInput from '@/components/CityInput'
import ProfileEventCard, { type ProfileEventItem } from '@/components/ProfileEventCard'
import { calculateAge, formatAge, formatBirthDate } from '@/lib/age'

type EventItem = {
  id: string
  hostId: string
  title: string
  theme?: string | null
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
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [upcomingRsvps, setUpcomingRsvps] = useState<RsvpItem[]>([])
  const [pastRsvps, setPastRsvps] = useState<RsvpItem[]>([])
  const [profileTab, setProfileTab] = useState<'hosted' | 'going' | 'archive'>('hosted')
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
      .get<{ success: boolean; events: EventItem[] }>('/events?limit=200')
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

  // Загружаем записи сразу за оба периода: «Я иду» и «Архив».
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRsvpsLoading(true)
    setRsvpsError('')

    const load = async (scope: 'upcoming' | 'past') => {
      const data = await api.get<{ success: boolean; rsvps: RsvpItem[] }>(
        `/users/me/rsvps?scope=${scope}`,
      )
      const rsvps = data.rsvps || []
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
      const cityById = new Map(cities)
      return rsvps.map((r) => ({
        ...r,
        event: { ...r.event, city: cityById.get(r.eventId) ?? null },
      }))
    }

    Promise.all([load('upcoming'), load('past')])
      .then(([upcoming, past]) => {
        if (cancelled) return
        setUpcomingRsvps(upcoming)
        setPastRsvps(past)
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
  }, [user])

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

  const handleCancelRsvp = async (rsvpId: string, eventId: string) => {
    setCancelingId(rsvpId)
    setRsvpsError('')
    try {
      await api.delete(`/events/${eventId}/rsvp`)
      setUpcomingRsvps((prev) => prev.filter((r) => r.id !== rsvpId))
      setPastRsvps((prev) => prev.filter((r) => r.id !== rsvpId))
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
    setBirthDate(user?.profile?.birthDate ? user.profile.birthDate.slice(0, 10) : '')
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
    if (birthDate) {
      const parsed = new Date(`${birthDate}T00:00:00.000Z`)
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        setSaveError('Укажите корректную дату рождения')
        return
      }
    }
    setSaving(true)
    setSaveError('')
    try {
      await api.patch('/users/me/profile', {
        nickname: nick,
        bio,
        district,
        city: cityValue,
        birthDate: birthDate || '',
      })
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

  const now = Date.now()
  const isPast = (iso: string) => new Date(iso).getTime() < now
  const todayISO = new Date().toISOString().slice(0, 10)
  const age = calculateAge(user.profile?.birthDate)
  const birthDateLabel = formatBirthDate(user.profile?.birthDate)

  const hostedUpcoming = myEvents.filter((event) => !isPast(event.startsAt))
  const hostedPast = myEvents.filter((event) => isPast(event.startsAt))

  const toHostedItem = (event: EventItem): ProfileEventItem => ({
    id: event.id,
    title: event.title,
    theme: event.theme,
    city: event.city,
    startsAt: event.startsAt,
    status: event.status,
    guests: event._count.guests,
    maxGuests: event.maxGuests,
    origin: 'hosted',
  })

  const toAttendedItem = (rsvp: RsvpItem): ProfileEventItem => ({
    id: rsvp.event.id,
    title: rsvp.event.title,
    theme: rsvp.event.theme,
    city: rsvp.event.city,
    startsAt: rsvp.event.startsAt,
    status: rsvp.event.status,
    guests: rsvp.event._count.guests,
    maxGuests: rsvp.event.maxGuests,
    origin: 'attended',
    rsvp: { id: rsvp.id, eventId: rsvp.eventId, status: rsvp.status },
  })

  const hostedItems = hostedUpcoming.map(toHostedItem)
  const goingItems = upcomingRsvps.map(toAttendedItem)

  const archiveMap = new Map<string, ProfileEventItem>()
  for (const event of hostedPast) archiveMap.set(event.id, toHostedItem(event))
  for (const rsvp of pastRsvps) {
    if (rsvp.status !== 'approved' && rsvp.status !== 'attended') continue
    // API может вернуть архивное событие с будущей датой — в архив берём только прошедшие.
    if (!isPast(rsvp.event.startsAt)) continue
    if (!archiveMap.has(rsvp.event.id)) {
      archiveMap.set(rsvp.event.id, toAttendedItem(rsvp))
    }
  }
  const archiveItems = Array.from(archiveMap.values()).sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  )

  const visibleItems =
    profileTab === 'hosted'
      ? hostedItems
      : profileTab === 'going'
        ? goingItems
        : archiveItems
  const listLoading = eventsLoading || rsvpsLoading

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
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="edit-birth-date"
                >
                  Дата рождения
                </label>
                <input
                  id="edit-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={todayISO}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  В публичном профиле показывается только возраст.
                </p>
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
              <dt className="font-medium text-gray-600">Дата рождения</dt>
              <dd className="text-gray-800">
                {birthDateLabel ? (
                  <>
                    {birthDateLabel}
                    {age != null && (
                      <span className="text-gray-500"> · {formatAge(age)}</span>
                    )}
                  </>
                ) : (
                  'Не указана'
                )}
              </dd>
            </div>
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

        {/* События */}
        <div className="mt-8">
          <h2 className="mb-4 text-2xl font-bold">События</h2>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setProfileTab('hosted')}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl">
                📅
              </span>
              <span>
                <span className="block text-lg font-bold text-gray-900">{hostedItems.length}</span>
                <span className="block text-sm text-gray-600">
                  предстоящих событий вы организуете
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setProfileTab('going')}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl">
                🎟️
              </span>
              <span>
                <span className="block text-lg font-bold text-gray-900">{goingItems.length}</span>
                <span className="block text-sm text-gray-600">событий, куда вы идёте</span>
              </span>
            </button>
          </div>

          <div className="mb-5 flex gap-6 border-b border-gray-200">
            {(
              [
                { key: 'hosted', label: 'Мои события', count: hostedItems.length },
                { key: 'going', label: 'Я иду', count: goingItems.length },
                { key: 'archive', label: 'Архив', count: archiveItems.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setProfileTab(tab.key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium transition ${
                  profileTab === tab.key
                    ? 'border-blue-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs ${
                    profileTab === tab.key ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {listLoading ? (
            <p className="text-gray-600">Загрузка событий...</p>
          ) : rsvpsError && profileTab !== 'hosted' ? (
            <p className="text-red-600">{rsvpsError}</p>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              {profileTab === 'hosted' ? (
                <>
                  <p className="text-gray-600">У вас пока нет предстоящих событий</p>
                  <Link
                    href="/events/new"
                    className="mt-3 inline-block text-blue-600 hover:underline"
                  >
                    Создать событие
                  </Link>
                </>
              ) : profileTab === 'going' ? (
                <>
                  <p className="text-gray-600">Вы пока никуда не идёте</p>
                  <Link href="/" className="mt-3 inline-block text-blue-600 hover:underline">
                    Смотреть события
                  </Link>
                </>
              ) : (
                <p className="text-gray-600">
                  Архив пока пуст — здесь появятся прошедшие события, которые вы организовали
                  или посетили
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleItems.map((item) => (
                <ProfileEventCard
                  key={`${item.origin}-${item.id}`}
                  item={item}
                  mode={profileTab}
                  onCancel={profileTab === 'going' ? handleCancelRsvp : undefined}
                  canceling={!!item.rsvp && cancelingId === item.rsvp.id}
                />
              ))}
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
