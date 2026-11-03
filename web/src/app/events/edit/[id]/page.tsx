'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import { validateCreateEvent, type CreateEventErrors } from '@/lib/validation'
import CityInput from '@/components/CityInput'

const THEMES = ['Кино', 'Настолки', 'Музыка', 'Книжный клуб', 'Мастер-класс', 'Другое']
const KNOWN_FIELDS = [
  'title',
  'description',
  'theme',
  'city',
  'addressPublic',
  'addressPrivate',
  'startsAt',
  'maxGuests',
] as const

type EventDetail = {
  id: string
  hostId: string
  title: string
  description?: string | null
  theme?: string | null
  city?: string | null
  addressPublic?: string | null
  addressPrivate?: string | null
  canViewPrivateAddress?: boolean
  hasPrivateAddress?: boolean
  startsAt: string
  maxGuests?: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

// ISO UTC → формат для <input type="datetime-local"> в часовом поясе пользователя
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEventPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const { city: selectedCity, ready: cityReady } = useCity()
  const router = useRouter()
  const id = params.id

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState('')
  const [city, setCity] = useState('')
  const [addressPublic, setAddressPublic] = useState('')
  const [addressPrivate, setAddressPrivate] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [errors, setErrors] = useState<CreateEventErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const prefilledRef = useRef(false)

  // Загружаем событие и заполняем форму текущими значениями.
  // Ждём завершения проверки сессии, чтобы получить точный адрес (он доступен только хосту).
  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    api
      .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
      .then((data) => {
        if (cancelled) return
        const ev = data.event
        setEvent(ev)
        setTitle(ev.title)
        setDescription(ev.description || '')
        setTheme(ev.theme || '')
        setAddressPublic(ev.addressPublic || '')
        setAddressPrivate(ev.addressPrivate || '')
        setStartsAt(isoToDatetimeLocal(ev.startsAt))
        setMaxGuests(ev.maxGuests != null ? String(ev.maxGuests) : '')
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setEventLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, authLoading, user])

  // Неавторизованный пользователь → на логин (middleware уже должен был отсечь)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?from=/events/edit/${id}`)
    }
  }, [authLoading, user, router, id])

  // Предзаполняем город: город события, иначе выбранный в шапке, иначе из профиля.
  useEffect(() => {
    if (!event || prefilledRef.current || authLoading || !cityReady) return
    setCity(event.city || selectedCity || user?.profile?.city || '')
    prefilledRef.current = true
  }, [event, authLoading, cityReady, selectedCity, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateCreateEvent({
      title,
      description,
      theme,
      city,
      addressPublic,
      addressPrivate,
      startsAt,
      maxGuests,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    setErrors({})
    setFormError('')
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        theme,
        city: city.trim(),
        addressPublic: addressPublic.trim(),
        addressPrivate: addressPrivate.trim(),
        // datetime-local → UTC ISO 8601
        startsAt: new Date(startsAt).toISOString(),
        maxGuests: maxGuests === '' ? undefined : Number(maxGuests),
      }
      const response = await api.patch<{ success: boolean; event: { id: string } }>(
        `/events/${id}`, // eslint-disable-line
        payload,
      )
      router.replace(`/events/${response.event.id}`)
    } catch (err) {
      const e = (err || {}) as {
        code?: string
        message?: string
        details?: Array<{ field?: string; message?: string }>
      }
      const fieldErrors: CreateEventErrors = {}
      for (const d of e.details ?? []) {
        if (d.field && d.message && (KNOWN_FIELDS as readonly string[]).includes(d.field)) {
          fieldErrors[d.field as (typeof KNOWN_FIELDS)[number]] = d.message
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        setFormError(e.message || 'Не удалось сохранить изменения. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || eventLoading) {
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

  if (!user) {
    return null
  }

  // Не-хост не может редактировать чужое событие
  if (user.id !== event.hostId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещён</h1>
          <p className="text-gray-600 mb-4">Вы не являетесь организатором этого события.</p>
          <button
            onClick={() => router.replace(`/events/${event.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Назад к событию
          </button>
        </div>
      </main>
    )
  }

  const themeOptions = event.theme && !THEMES.includes(event.theme) ? [...THEMES, event.theme] : THEMES

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Редактировать событие</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              Название
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: квартирник у Саши"
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Описание <span className="text-gray-400">(необязательно)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите, что вас ждёт..."
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="theme">
              Тематика <span className="text-gray-400">(необязательно)</span>
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={`w-full p-2 border rounded text-gray-900 ${errors.theme ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">— не выбрано —</option>
              {themeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.theme && <p className="mt-1 text-sm text-red-600">{errors.theme}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
              Город
            </label>
            <CityInput
              id="city"
              value={city}
              onChange={setCity}
              hasError={!!errors.city}
              placeholder="Например: Москва"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="addressPublic"
              >
                Публичный адрес
              </label>
              <input
                id="addressPublic"
                type="text"
                value={addressPublic}
                onChange={(e) => setAddressPublic(e.target.value)}
                maxLength={150}
                placeholder="Например: Хамовники, квартал 3"
                className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${errors.addressPublic ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Виден всем: район, квартал или ориентир без точного дома.
              </p>
              {errors.addressPublic && (
                <p className="mt-1 text-sm text-red-600">{errors.addressPublic}</p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="addressPrivate"
              >
                Точный адрес
              </label>
              <input
                id="addressPrivate"
                type="text"
                value={addressPrivate}
                onChange={(e) => setAddressPrivate(e.target.value)}
                maxLength={200}
                placeholder="Улица, дом, квартира, код подъезда"
                className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${errors.addressPrivate ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Видят только вы и подтверждённые участники.
              </p>
              {errors.addressPrivate && (
                <p className="mt-1 text-sm text-red-600">{errors.addressPrivate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startsAt">
              Дата и время начала
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={`w-full p-2 border rounded text-gray-900 ${errors.startsAt ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.startsAt && <p className="mt-1 text-sm text-red-600">{errors.startsAt}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxGuests">
              Максимум гостей <span className="text-gray-400">(необязательно, 1–100)</span>
            </label>
            <input
              id="maxGuests"
              type="number"
              min={1}
              max={100}
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              placeholder="Например: 20"
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${errors.maxGuests ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.maxGuests && <p className="mt-1 text-sm text-red-600">{errors.maxGuests}</p>}
          </div>

          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{formError}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Сохраняем...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/events/${event.id}`)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
