'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type EventItem = {
  id: string
  hostId: string
  title: string
  status: string
  startsAt: string
  maxGuests?: number | null
  _count: { guests: number }
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
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  const [myEvents, setMyEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

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

  const handleLogout = async () => {
    await logout()
    router.replace('/')
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
          <div className="flex items-center gap-4 mb-4">
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
      </div>
    </main>
  )
}
