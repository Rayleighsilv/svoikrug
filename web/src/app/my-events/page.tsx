'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Header from '@/components/Header'
import EventListSkeleton from '@/components/EventListSkeleton'
import ProfileEventCard, { type ProfileEventItem } from '@/components/ProfileEventCard'

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

export default function MyEventsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [myEvents, setMyEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [upcomingRsvps, setUpcomingRsvps] = useState<RsvpItem[]>([])
  const [pastRsvps, setPastRsvps] = useState<RsvpItem[]>([])
  const [profileTab, setProfileTab] = useState<'hosted' | 'going' | 'archive'>('hosted')
  const [rsvpsLoading, setRsvpsLoading] = useState(true)
  const [rsvpsError, setRsvpsError] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Middleware уже должен отсечь гостей, но подстраховываемся в UI.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?from=/my-events')
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="mx-auto max-w-3xl p-4 sm:p-6" aria-busy="true" aria-label="Загрузка событий">
          <div className="mb-6 h-8 w-36 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          </div>
          <EventListSkeleton count={2} />
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
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link
          href="/profile"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          В профиль
        </Link>

        <h1 className="mb-4 text-2xl font-bold">Мои события</h1>

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
          <EventListSkeleton count={2} />
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
    </main>
  )
}
