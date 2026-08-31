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

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const id = params.id

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
      .then((data) => {
        if (!cancelled) setEvent(data.event)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const isHost = !!(user && event && user.id === event.hostId)

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

  const handleRegister = () => {
    if (!user) {
      router.replace(`/login?from=/events/${id}`)
      return
    }
    alert('RSVP будет реализован в следующей задаче')
  }

  const handleDelete = async () => {
    if (!event) return
    if (!window.confirm('Удалить это событие?')) return
    try {
      await api.delete(`/events/${event.id}`)
      router.replace('/')
    } catch (err) {
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
        <button
          onClick={() => router.replace('/')}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Назад к событиям
        </button>

        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
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
          <h2 className="text-lg font-semibold mb-3">Участники</h2>
          <p className="text-gray-700">
            {event.maxGuests != null
              ? `Записалось: ${event._count.guests} из ${event.maxGuests}`
              : 'Без ограничения по числу гостей'}
          </p>
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
              </>
            ) : (
              <button
                onClick={handleRegister}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Записаться
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
