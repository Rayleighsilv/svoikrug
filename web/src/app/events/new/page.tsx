'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import { validateCreateEvent, type CreateEventErrors } from '@/lib/validation'
import {
  clearDraft,
  clearDraftCover,
  defaultDraft,
  loadDraft,
  loadDraftCover,
  saveDraft,
  saveDraftCover,
  type DraftBudgetType,
  type DraftSportLevel,
  type EventDraftData,
} from '@/lib/eventDraft'
import {
  DURATION_OPTIONS,
  PLATFORM_OPTIONS,
  SPORT_LEVEL_OPTIONS,
  VENUE_TYPE_OPTIONS,
  durationLabel,
} from '@/lib/eventLabels'
import {
  FORMATS,
  FORMAT_BY_SLUG,
  findSubcategory,
  isEventFormat,
  type EventFormat,
} from '@/lib/formats'
import { useTags, type Tag } from '@/lib/tags'
import CityInput from '@/components/CityInput'
import EventCoverField from '@/components/EventCoverField'
import EventWizardPreview from '@/components/EventWizardPreview'
import EventWizardProgress, { WIZARD_STEPS } from '@/components/EventWizardProgress'
import TagPicker from '@/components/TagPicker'
import Toggle from '@/components/Toggle'

type WizardErrors = CreateEventErrors & {
  budgetAmount?: string
  budgetNote?: string
}

const QUICK_RULES = [
  'без телефонов',
  'разуваться',
  'без мата',
  'со своим алкоголем',
  'можно опаздывать',
]

const STEP_ERROR_KEYS: (keyof WizardErrors)[][] = [
  ['title', 'description'],
  ['city', 'addressPublic', 'addressPrivate'],
  ['startsAt', 'maxGuests'],
  ['tags', 'budgetAmount', 'budgetNote'],
  [],
]

const FIELD_STEP: Record<string, number> = {
  title: 0,
  description: 0,
  theme: 0,
  city: 1,
  addressPublic: 1,
  addressPrivate: 1,
  venueType: 1,
  platform: 1,
  startsAt: 2,
  maxGuests: 2,
  durationMinutes: 2,
  tags: 3,
  houseRules: 3,
  houseRulesChips: 3,
  applicationQuestion: 3,
  sportLevel: 3,
  weatherDependent: 3,
  budgetType: 3,
  budgetAmount: 3,
  budgetNote: 3,
}

export default function NewEventPage() {
  const { user, loading } = useAuth()
  const { city: selectedCity, ready: cityReady } = useCity()
  const router = useRouter()
  const { tags: tagCatalog } = useTags()

  const [form, setForm] = useState<EventDraftData>(defaultDraft)
  const [errors, setErrors] = useState<WizardErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [publishNow, setPublishNow] = useState(true)
  const [timezone, setTimezone] = useState('')
  const [draftDirty, setDraftDirty] = useState(false)
  const [dirtyTick, setDirtyTick] = useState(0)

  const prefilledRef = useRef(false)
  const draftCityRef = useRef<string | undefined>(undefined)
  const hasDraftRef = useRef(false)
  const dirtyRef = useRef(false)
  const coverTouchedRef = useRef(false)
  const completedRef = useRef(false)

  function markDirty() {
    dirtyRef.current = true
    setDraftDirty(true)
    setDirtyTick((tick) => tick + 1)
  }

  function update<K extends keyof EventDraftData>(key: K, value: EventDraftData[K]) {
    markDirty()
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Восстанавливаем черновик до того, как сработает автоподстановка города.
  useEffect(() => {
    const saved = loadDraft()
    if (saved) {
      const { version, savedAt, ...draftData } = saved
      void version
      void savedAt
      hasDraftRef.current = true
      draftCityRef.current = saved.city
      setForm(draftData)

      void loadDraftCover()
        .then((file) => {
          if (file && !coverTouchedRef.current) setCoverFile(file)
        })
        .catch(() => {})
    } else {
      // Обложка без черновика — осиротевшая запись из прошлой сессии.
      void clearDraftCover()
    }

    setDraftReady(true)
  }, [])

  // Предзаполняем город: из черновика, иначе выбранный в шапке / из профиля.
  useEffect(() => {
    if (prefilledRef.current || loading || !cityReady) return
    const city = draftCityRef.current || selectedCity || user?.profile?.city || ''
    setForm((prev) => ({ ...prev, city }))
    prefilledRef.current = true
  }, [loading, cityReady, selectedCity, user])

  // Формат из ссылки имеет смысл только для нового черновика.
  useEffect(() => {
    if (hasDraftRef.current) return
    const params = new URLSearchParams(window.location.search)
    const requestedFormat = params.get('format')
    if (!requestedFormat || !isEventFormat(requestedFormat)) return

    const requestedSub = params.get('subcategory')
    setForm((prev) => ({
      ...prev,
      format: requestedFormat,
      subcategory:
        requestedSub && findSubcategory(requestedSub)?.format.slug === requestedFormat
          ? requestedSub
          : '',
    }))
  }, [])

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
    } catch {
      setTimezone('')
    }
  }, [])

  // Автосохранение черновика (текстовые поля — в localStorage).
  // Пишем сразу после действия пользователя, чтобы перезагрузка не теряла ввод.
  useEffect(() => {
    if (!draftReady || completedRef.current || !dirtyRef.current) return
    saveDraft(form)
    setDraftSaved(true)
  }, [form, draftReady, dirtyTick])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?from=/events/new')
    }
  }, [loading, user, router])

  const previewCoverUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  )

  useEffect(() => {
    if (!previewCoverUrl) return
    return () => URL.revokeObjectURL(previewCoverUrl)
  }, [previewCoverUrl])

  const previewTags = useMemo(
    () =>
      form.tags
        .map((slug) => tagCatalog.find((tag) => tag.slug === slug))
        .filter((tag): tag is Tag => Boolean(tag)),
    [form.tags, tagCatalog],
  )

  const handleCoverChange = (file: File | null) => {
    markDirty()
    coverTouchedRef.current = true
    setCoverFile(file)
    void saveDraftCover(file).catch(() => {})
  }

  const handleFormatChange = (nextFormat: EventFormat) => {
    markDirty()
    setForm((prev) => {
      const subcategory =
        findSubcategory(prev.subcategory)?.format.slug === nextFormat
          ? prev.subcategory
          : ''
      return { ...prev, format: nextFormat, subcategory }
    })
  }

  const toggleQuickRule = (rule: string) => {
    markDirty()
    setForm((prev) => ({
      ...prev,
      houseRulesChips: prev.houseRulesChips.includes(rule)
        ? prev.houseRulesChips.filter((item) => item !== rule)
        : [...prev.houseRulesChips, rule],
    }))
  }

  const buildErrors = (): WizardErrors => {
    const subcategoryMeta = findSubcategory(form.subcategory)
    const base = validateCreateEvent({
      title: form.title,
      description: form.description,
      theme: subcategoryMeta?.label ?? '',
      city: form.city,
      addressPublic: form.addressPublic,
      addressPrivate: form.addressPrivate,
      startsAt: form.startsAt,
      maxGuests: form.maxGuests,
      tags: form.tags,
    })
    const next: WizardErrors = { ...base }

    if (form.budgetType === 'split') {
      const amount = Number(form.budgetAmount)
      if (!form.budgetAmount.trim()) {
        next.budgetAmount = 'Укажите сумму складчины'
      } else if (!Number.isInteger(amount) || amount <= 0) {
        next.budgetAmount = 'Сумма должна быть целым числом больше 0'
      }
      if (!form.budgetNote.trim()) {
        next.budgetNote = 'Укажите, на что собираем'
      }
    }

    return next
  }

  const validateStep = (stepIndex: number): boolean => {
    const all = buildErrors()
    const stepErrors = Object.fromEntries(
      STEP_ERROR_KEYS[stepIndex]
        .filter((key) => all[key])
        .map((key) => [key, all[key]]),
    ) as WizardErrors

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return false
    }
    setErrors({})
    return true
  }

  const goToStep = (index: number) => {
    update('step', Math.max(0, Math.min(WIZARD_STEPS.length - 1, index)))
    setErrors({})
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNext = () => {
    if (!validateStep(form.step)) return
    goToStep(form.step + 1)
  }

  const handleBack = () => {
    goToStep(form.step - 1)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return

    const all = buildErrors()
    if (Object.keys(all).length > 0) {
      const firstStep = STEP_ERROR_KEYS.findIndex((keys) =>
        keys.some((key) => all[key]),
      )
      update('step', firstStep >= 0 ? firstStep : 0)
      setErrors(all)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const subcategoryMeta = findSubcategory(form.subcategory)
      const startsAt = new Date(form.startsAt)
      const endsAt = new Date(
        startsAt.getTime() + form.durationMinutes * 60 * 1000,
      ).toISOString()

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        theme: subcategoryMeta?.label,
        format: form.format,
        subcategory: form.subcategory || undefined,
        city: form.city.trim(),
        addressPublic: form.addressPublic.trim(),
        addressPrivate: form.addressPrivate.trim(),
        startsAt: startsAt.toISOString(),
        endsAt,
        durationMinutes: form.durationMinutes,
        maxGuests: form.maxGuests === '' ? undefined : Number(form.maxGuests),
        waitlistEnabled: form.waitlistEnabled,
        plusOneEnabled: form.plusOneEnabled,
        houseRules: form.houseRules.trim() || undefined,
        houseRulesChips: form.houseRulesChips.length > 0 ? form.houseRulesChips : undefined,
        applicationQuestion: form.applicationQuestion.trim() || undefined,
        sportLevel:
          form.format === 'sport' && form.sportLevel ? form.sportLevel : undefined,
        weatherDependent: form.format === 'sport' ? form.weatherDependent : false,
        budgetType: form.budgetType,
        budgetAmount:
          form.budgetType === 'split' && form.budgetAmount.trim()
            ? Number(form.budgetAmount)
            : undefined,
        budgetNote:
          form.budgetType === 'split' ? form.budgetNote.trim() || undefined : undefined,
        venueType: form.format === 'sport' ? form.venueType || undefined : undefined,
        platform: form.format === 'online' ? form.platform || undefined : undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
      }

      const response = await api.post<{ success: boolean; event: { id: string } }>(
        '/events',
        payload,
      )
      const eventId = response.event.id

      if (coverFile) {
        try {
          const formData = new FormData()
          formData.append('cover', coverFile)
          await api.post(`/events/${eventId}/cover`, formData)
        } catch (coverError) {
          console.error('Не удалось загрузить обложку:', coverError)
          window.alert(
            'Событие создано, но обложку загрузить не удалось. Добавьте её при редактировании.',
          )
        }
      }

      if (publishNow) {
        try {
          await api.patch(`/events/${eventId}`, { status: 'published' })
        } catch (publishError) {
          console.error('Не удалось опубликовать событие:', publishError)
        }
      }

      completedRef.current = true
      clearDraft()
      void clearDraftCover()
      router.replace(`/events/${eventId}?created=1`)
    } catch (err) {
      const error = (err || {}) as {
        message?: string
        details?: Array<{ field?: string; message?: string }>
      }
      const fieldErrors: WizardErrors = {}
      let firstStep = 0
      for (const detail of error.details ?? []) {
        if (!detail.field || !detail.message) continue
        const key = detail.field.split('.')[0]
        ;(fieldErrors as Record<string, string>)[key] = detail.message
        const mappedStep = FIELD_STEP[key]
        if (mappedStep != null) firstStep = Math.min(firstStep, mappedStep)
      }

      if (Object.keys(fieldErrors).length > 0) {
        update('step', firstStep)
        setErrors(fieldErrors)
      } else {
        setFormError(error.message || 'Не удалось создать событие. Попробуйте ещё раз.')
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

  if (!user) return null

  const formatMeta = FORMAT_BY_SLUG[form.format]
  const subcategoryMeta = findSubcategory(form.subcategory)
  const addressFilled = Boolean(
    form.city.trim() && form.addressPublic.trim() && form.addressPrivate.trim(),
  )
  const photoAdded = Boolean(coverFile)
  const rulesFilled = Boolean(form.houseRules.trim() || form.houseRulesChips.length > 0)
  const previewHost = {
    id: user.id,
    nickname: user.profile?.nickname ?? 'Вы',
    avatarUrl: user.profile?.avatarUrl ?? null,
    trustScore: user.profile?.trustScore ?? 0,
  }

  const inputClass = (hasError: boolean) =>
    `w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← К событиям
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Создать событие</h1>
            <p className="mt-1 text-sm text-gray-500">
              Шаг {form.step + 1} из {WIZARD_STEPS.length} · {WIZARD_STEPS[form.step]}
            </p>
          </div>
          <span className="text-xs text-gray-400" aria-live="polite">
            {!draftReady
              ? 'Загружаем черновик…'
              : draftDirty
                ? draftSaved
                  ? '✓ Черновик сохранён'
                  : 'Сохраняем черновик…'
                : hasDraftRef.current || draftSaved
                  ? '✓ Черновик сохранён'
                  : 'Черновик сохраняется автоматически'}
          </span>
        </div>

        <EventWizardProgress step={form.step} onStepClick={goToStep} />

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // Enter на промежуточных шагах не должен отправлять всю форму.
            if (e.key === 'Enter' && form.step < 4) {
              const tag = (e.target as HTMLElement).tagName
              if (tag !== 'TEXTAREA') e.preventDefault()
            }
          }}
          className="mt-4 space-y-5 rounded-2xl bg-white p-6 shadow"
          noValidate
        >
          <h2 className="text-lg font-semibold">{WIZARD_STEPS[form.step]}</h2>

          {form.step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="title">
                  Название
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Например: квартирник у Саши"
                  className={inputClass(!!errors.title)}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="description"
                >
                  Описание <span className="text-gray-400">(необязательно)</span>
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Расскажите, что вас ждёт..."
                  className={inputClass(!!errors.description)}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">Формат</span>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((format) => {
                    const active = form.format === format.slug
                    return (
                      <button
                        key={format.slug}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleFormatChange(format.slug)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {format.emoji} {format.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="subcategory"
                >
                  Тематика <span className="text-gray-400">(необязательно)</span>
                </label>
                <select
                  id="subcategory"
                  value={form.subcategory}
                  onChange={(e) => update('subcategory', e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">— не выбрано —</option>
                  {formatMeta.subcategories.map((subcategory) => (
                    <option key={subcategory.slug} value={subcategory.slug}>
                      {subcategory.emoji} {subcategory.label}
                    </option>
                  ))}
                </select>
              </div>

              <EventCoverField
                file={coverFile}
                removed={false}
                fallback={{
                  emoji: subcategoryMeta?.emoji ?? formatMeta.emoji,
                  gradient: formatMeta.gradient,
                }}
                onFileChange={handleCoverChange}
                onRemove={() => handleCoverChange(null)}
              />
            </div>
          )}

          {form.step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="city">
                  Город
                </label>
                <CityInput
                  id="city"
                  value={form.city}
                  onChange={(value) => update('city', value)}
                  hasError={!!errors.city}
                  placeholder="Например: Москва"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-gray-700"
                    htmlFor="addressPublic"
                  >
                    Публичный адрес
                  </label>
                  <input
                    id="addressPublic"
                    type="text"
                    value={form.addressPublic}
                    onChange={(e) => update('addressPublic', e.target.value)}
                    maxLength={150}
                    placeholder="Например: Хамовники, квартал 3"
                    className={inputClass(!!errors.addressPublic)}
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
                    className="mb-1 block text-sm font-medium text-gray-700"
                    htmlFor="addressPrivate"
                  >
                    Точный адрес
                  </label>
                  <input
                    id="addressPrivate"
                    type="text"
                    value={form.addressPrivate}
                    onChange={(e) => update('addressPrivate', e.target.value)}
                    maxLength={200}
                    placeholder="Улица, дом, квартира, код подъезда"
                    className={inputClass(!!errors.addressPrivate)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Видят только вы и подтверждённые участники.
                  </p>
                  {errors.addressPrivate && (
                    <p className="mt-1 text-sm text-red-600">{errors.addressPrivate}</p>
                  )}
                </div>
              </div>

              {form.format === 'sport' && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-gray-700"
                    htmlFor="venueType"
                  >
                    Тип площадки
                  </label>
                  <select
                    id="venueType"
                    value={form.venueType}
                    onChange={(e) => update('venueType', e.target.value)}
                    className={inputClass(false)}
                  >
                    {VENUE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.format === 'online' && (
                <div className="space-y-2">
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-gray-700"
                      htmlFor="platform"
                    >
                      Платформа
                    </label>
                    <select
                      id="platform"
                      value={form.platform}
                      onChange={(e) => update('platform', e.target.value)}
                      className={inputClass(false)}
                    >
                      {PLATFORM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                    Ссылка выдаётся после одобрения
                  </div>
                </div>
              )}
            </div>
          )}

          {form.step === 2 && (
            <div className="space-y-5">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="startsAt"
                >
                  Дата и время начала
                </label>
                <input
                  id="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => update('startsAt', e.target.value)}
                  className={inputClass(!!errors.startsAt)}
                />
                {errors.startsAt && (
                  <p className="mt-1 text-sm text-red-600">{errors.startsAt}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {timezone
                    ? `Время указывается в вашем часовом поясе: ${timezone}`
                    : 'Время указывается в вашем часовом поясе'}
                </p>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="duration"
                >
                  Длительность
                </label>
                <select
                  id="duration"
                  value={form.durationMinutes}
                  onChange={(e) => update('durationMinutes', Number(e.target.value))}
                  className={inputClass(false)}
                >
                  {DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {durationLabel(minutes)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="maxGuests"
                >
                  Максимум гостей{' '}
                  <span className="text-gray-400">(необязательно, 1–100)</span>
                </label>
                <input
                  id="maxGuests"
                  type="number"
                  min={1}
                  max={100}
                  value={form.maxGuests}
                  onChange={(e) => update('maxGuests', e.target.value)}
                  placeholder="Например: 20"
                  className={inputClass(!!errors.maxGuests)}
                />
                {errors.maxGuests && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxGuests}</p>
                )}
              </div>

              <div className="space-y-3">
                <Toggle
                  checked={form.waitlistEnabled}
                  onChange={(checked) => update('waitlistEnabled', checked)}
                  label="Лист ожидания"
                  description="Если мест не хватит, гости смогут записаться в очередь."
                />
                <Toggle
                  checked={form.plusOneEnabled}
                  onChange={(checked) => update('plusOneEnabled', checked)}
                  label="Можно +1"
                  description="Гость может прийти с одним человеком."
                />
              </div>
            </div>
          )}

          {form.step === 3 && (
            <div className="space-y-5">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="houseRules"
                >
                  Правила дома <span className="text-gray-400">(необязательно)</span>
                </label>
                <textarea
                  id="houseRules"
                  rows={3}
                  maxLength={1000}
                  value={form.houseRules}
                  onChange={(e) => update('houseRules', e.target.value)}
                  placeholder="Например: снимаем обувь, не шумим после 23:00"
                  className={inputClass(false)}
                />
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Быстрые правила
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_RULES.map((rule) => {
                    const active = form.houseRulesChips.includes(rule)
                    return (
                      <button
                        key={rule}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleQuickRule(rule)}
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {rule}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-gray-700"
                  htmlFor="applicationQuestion"
                >
                  Вопрос для заявки{' '}
                  <span className="text-gray-400">(необязательно)</span>
                </label>
                <input
                  id="applicationQuestion"
                  type="text"
                  maxLength={300}
                  value={form.applicationQuestion}
                  onChange={(e) => update('applicationQuestion', e.target.value)}
                  placeholder="Например: что вам ближе — тихий вечер или громкая компания?"
                  className={inputClass(false)}
                />
                <p className="mt-1 text-xs text-gray-500">Один вопрос, на который ответит гость.</p>
              </div>

              <TagPicker
                value={form.tags}
                onChange={(tags) => update('tags', tags)}
                error={errors.tags}
              />

              {form.format === 'sport' && (
                <div className="space-y-3">
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-gray-700"
                      htmlFor="sportLevel"
                    >
                      Уровень
                    </label>
                    <select
                      id="sportLevel"
                      value={form.sportLevel}
                      onChange={(e) =>
                        update('sportLevel', e.target.value as DraftSportLevel)
                      }
                      className={inputClass(false)}
                    >
                      <option value="">— не выбрано —</option>
                      {SPORT_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Toggle
                    checked={form.weatherDependent}
                    onChange={(checked) => update('weatherDependent', checked)}
                    label="Погодозависимо"
                    description="Встреча может переноситься из-за погоды."
                  />
                </div>
              )}

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">Бюджет</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: 'free', label: 'Бесплатно' },
                      { value: 'split', label: 'Складчина' },
                    ] as const
                  ).map((option) => {
                    const active = form.budgetType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => update('budgetType', option.value as DraftBudgetType)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {form.budgetType === 'split' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-1 block text-sm font-medium text-gray-700"
                        htmlFor="budgetAmount"
                      >
                        Сумма, ₽
                      </label>
                      <input
                        id="budgetAmount"
                        type="number"
                        min={0}
                        value={form.budgetAmount}
                        onChange={(e) => update('budgetAmount', e.target.value)}
                        placeholder="Например: 500"
                        className={inputClass(!!errors.budgetAmount)}
                      />
                      {errors.budgetAmount && (
                        <p className="mt-1 text-sm text-red-600">{errors.budgetAmount}</p>
                      )}
                    </div>
                    <div>
                      <label
                        className="mb-1 block text-sm font-medium text-gray-700"
                        htmlFor="budgetNote"
                      >
                        На что собираем
                      </label>
                      <input
                        id="budgetNote"
                        type="text"
                        maxLength={200}
                        value={form.budgetNote}
                        onChange={(e) => update('budgetNote', e.target.value)}
                        placeholder="Например: продукты и напитки"
                        className={inputClass(!!errors.budgetNote)}
                      />
                      {errors.budgetNote && (
                        <p className="mt-1 text-sm text-red-600">{errors.budgetNote}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {form.step === 4 && (
            <div className="space-y-5">
              <EventWizardPreview
                form={form}
                coverUrl={previewCoverUrl}
                host={previewHost}
                tags={previewTags}
              />

              <div className="rounded-xl bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Чек-лист</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className={addressFilled ? 'text-green-600' : 'text-gray-500'}>
                    {addressFilled ? '✓' : '—'} Адрес указан
                  </li>
                  <li className={photoAdded ? 'text-green-600' : 'text-gray-500'}>
                    {photoAdded ? '✓' : '—'} Фото добавлено
                  </li>
                  <li className={rulesFilled ? 'text-green-600' : 'text-gray-500'}>
                    {rulesFilled ? '✓' : '—'} Правила заполнены
                  </li>
                </ul>
              </div>

              <Toggle
                checked={publishNow}
                onChange={setPublishNow}
                label="Опубликовать сразу"
                description="Событие сразу появится в ленте. Если выключить — останется черновиком."
              />
            </div>
          )}

          {formError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="sticky bottom-0 z-20 -mx-6 -mb-6 flex flex-wrap gap-3 rounded-b-2xl border-t border-gray-200 bg-white px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2">
            {form.step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Назад
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/')}
                className="min-h-[44px] rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Отмена
              </button>
            )}

            {form.step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Далее
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
              >
                {submitting ? 'Создаём событие...' : 'Создать событие'}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
