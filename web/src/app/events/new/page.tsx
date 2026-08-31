'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { validateCreateEvent, type CreateEventErrors } from '@/lib/validation'

const THEMES = ['Кино', 'Настолки', 'Музыка', 'Книжный клуб', 'Мастер-класс', 'Другое']
const KNOWN_FIELDS = ['title', 'description', 'theme', 'startsAt', 'maxGuests'] as const

export default function NewEventPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [errors, setErrors] = useState<CreateEventErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Middleware уже должен был отсечь гостей, но подстраховываемся в UI.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?from=/events/new')
    }
  }, [loading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Клиентская валидация до отправки (сверена с createEventSchema)
    const validation = validateCreateEvent({ title, description, theme, startsAt, maxGuests })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    setErrors({})
    setFormError('')
    setSubmitting(true)
    try {
      // Бэк сам определит hostId из токена. Отправляем только поля формы.
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        theme: theme || undefined,
        // datetime-local → UTC ISO 8601 с часовым поясом
        startsAt: new Date(startsAt).toISOString(),
        maxGuests: maxGuests === '' ? undefined : Number(maxGuests),
      }
      const response = await api.post<{ success: boolean; event: { id: string } }>(
        '/events',
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
        setFormError(e.message || 'Не удалось создать событие. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Загрузка...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Создать событие</h1>

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
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.theme && <p className="mt-1 text-sm text-red-600">{errors.theme}</p>}
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Создаём событие...' : 'Создать событие'}
          </button>
        </form>
      </div>
    </main>
  )
}
