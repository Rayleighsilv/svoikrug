'use client'

import Avatar from '@/components/Avatar'
import EventCard, { type EventCardEvent } from '@/components/EventCard'
import EventImage from '@/components/EventImage'
import { formatDateTime } from '@/lib/date'
import type { EventDraftData } from '@/lib/eventDraft'
import {
  PLATFORM_OPTIONS,
  SPORT_LEVEL_OPTIONS,
  VENUE_TYPE_OPTIONS,
  durationLabel,
  optionLabel,
} from '@/lib/eventLabels'
import { FORMAT_BY_SLUG, findSubcategory } from '@/lib/formats'
import type { Tag } from '@/lib/tags'

type PreviewHost = {
  id: string
  nickname: string
  avatarUrl?: string | null
  trustScore: number
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {children}
    </span>
  )
}

export default function EventWizardPreview({
  form,
  coverUrl,
  host,
  tags,
}: {
  form: EventDraftData
  coverUrl: string | null
  host: PreviewHost
  tags: Tag[]
}) {
  const subcategoryMeta = findSubcategory(form.subcategory)
  const formatMeta = FORMAT_BY_SLUG[form.format]
  const startsAtValid =
    form.startsAt !== '' && !Number.isNaN(new Date(form.startsAt).getTime())
  const startsAt = startsAtValid
    ? new Date(form.startsAt).toISOString()
    : new Date().toISOString()
  const maxGuests =
    form.maxGuests !== '' && Number.isFinite(Number(form.maxGuests))
      ? Number(form.maxGuests)
      : null

  const previewEvent: EventCardEvent = {
    id: 'preview',
    title: form.title.trim() || 'Название события',
    theme: subcategoryMeta?.label ?? null,
    format: form.format,
    subcategory: form.subcategory || null,
    city: form.city.trim() || null,
    addressPublic: form.addressPublic.trim() || null,
    coverImageUrl: coverUrl,
    startsAt,
    maxGuests,
    tags,
    host: {
      id: host.id,
      profile: {
        nickname: host.nickname,
        avatarUrl: host.avatarUrl ?? null,
        trustScore: host.trustScore,
      },
      _count: { ratingsReceived: 0 },
    },
    _count: { guests: 0 },
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Карточка события</h3>
        <ul className="space-y-3">
          <EventCard event={previewEvent} href={null} />
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Страница события</h3>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <EventImage
            src={coverUrl}
            alt="Обложка события"
            fallback={{
              emoji: subcategoryMeta?.emoji ?? formatMeta.emoji,
              gradient: formatMeta.gradient,
            }}
            className="mb-3 h-40 w-full rounded-xl"
          />

          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-gray-900">
              {form.title.trim() || 'Название события'}
            </h4>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatMeta.emoji} {formatMeta.label}
            </span>
          </div>

          {subcategoryMeta && (
            <p className="mt-1 text-sm text-gray-500">Тема: {subcategoryMeta.label}</p>
          )}

          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {form.city.trim() && <p>📍 {form.city.trim()}</p>}
            {form.addressPublic.trim() && <p>🏠 {form.addressPublic.trim()}</p>}
            {form.addressPrivate.trim() && (
              <p className="text-gray-500">Точный адрес: {form.addressPrivate.trim()}</p>
            )}
            <p>
              🕒 {formatDateTime(startsAt)}
              {` · ${durationLabel(form.durationMinutes)}`}
            </p>
            <p>
              👥{' '}
              {maxGuests != null ? `До ${maxGuests} гостей` : 'Без ограничения по гостям'}
            </p>
            {(form.waitlistEnabled || form.plusOneEnabled) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.waitlistEnabled && <Chip>лист ожидания</Chip>}
                {form.plusOneEnabled && <Chip>можно +1</Chip>}
              </div>
            )}
          </div>

          {form.description.trim() && (
            <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
              {form.description.trim()}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {form.format === 'sport' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {form.venueType && (
                <Chip>{optionLabel(VENUE_TYPE_OPTIONS, form.venueType)}</Chip>
              )}
              {form.sportLevel && (
                <Chip>Уровень: {optionLabel(SPORT_LEVEL_OPTIONS, form.sportLevel)}</Chip>
              )}
              {form.weatherDependent && <Chip>погодозависимо</Chip>}
            </div>
          )}

          {form.format === 'online' && form.platform && (
            <p className="mt-3 text-sm text-gray-600">
              Платформа: {optionLabel(PLATFORM_OPTIONS, form.platform)} · ссылка выдаётся
              после одобрения
            </p>
          )}

          <p className="mt-3 text-sm font-medium text-gray-700">
            {form.budgetType === 'split'
              ? `Складчина: ${form.budgetAmount || '—'} ₽${
                  form.budgetNote.trim() ? ` · ${form.budgetNote.trim()}` : ''
                }`
              : 'Бесплатно'}
          </p>

          {(form.houseRules.trim() || form.houseRulesChips.length > 0) && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-sm font-semibold text-gray-700">Правила дома</p>
              {form.houseRules.trim() && (
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                  {form.houseRules.trim()}
                </p>
              )}
              {form.houseRulesChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.houseRulesChips.map((rule) => (
                    <Chip key={rule}>{rule}</Chip>
                  ))}
                </div>
              )}
            </div>
          )}

          {form.applicationQuestion.trim() && (
            <p className="mt-3 text-sm text-gray-600">
              Вопрос для заявки: {form.applicationQuestion.trim()}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <Avatar url={host.avatarUrl} name={host.nickname} size="w-8 h-8" />
            <span>
              Организатор:{' '}
              <span className="font-medium text-gray-900">{host.nickname}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
