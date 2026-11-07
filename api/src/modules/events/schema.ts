// api/src/modules/events/schema.ts
import { z } from 'zod'
import { normalizeCity } from '../../common/city'

// Город нормализуем до проверки длины: "  a  " не должен проходить min(2).
const citySchema = z
  .string()
  .transform(normalizeCity)
  .pipe(
    z
      .string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be at most 50 characters'),
  )

// Публичный адрес видят все, точный — только хост и подтверждённые гости.
const addressPublicSchema = z
  .string()
  .trim()
  .min(3, 'Публичный адрес должен содержать минимум 3 символа')
  .max(150, 'Публичный адрес должен быть не длиннее 150 символов')

const addressPrivateSchema = z
  .string()
  .trim()
  .min(3, 'Точный адрес должен содержать минимум 3 символа')
  .max(200, 'Точный адрес должен быть не длиннее 200 символов')

// Приватная ссылка на онлайн-встречу; null очищает значение.
const meetingLinkSchema = z
  .string()
  .trim()
  .max(500, 'Ссылка должна быть не длиннее 500 символов')
  .url('Укажите корректную ссылку')
  .refine(
    (value) => /^https?:\/\//i.test(value),
    'Ссылка должна начинаться с http:// или https://',
  )
  .nullable()

// География участия онлайн-события. Для offline/sport сервер принудительно
// выставляет 'city', для online по умолчанию — 'any'.
export const PARTICIPANT_GEOS = ['any', 'city'] as const
const participantGeoSchema = z.enum(PARTICIPANT_GEOS)

// Форматы встреч. Слаги совпадают с enum EventFormat в Prisma.
export const EVENT_FORMATS = ['offline', 'sport', 'online'] as const
const eventFormatSchema = z.enum(EVENT_FORMATS)
const subcategorySchema = z.string().trim().min(1).max(50)

// Максимум тегов на событие — синхронизировано с клиентским TagPicker.
export const MAX_EVENT_TAGS = 8

// Теги приходят слагами из справочника `tags`. Существование слагов
// проверяет сервис (Zod не знает про БД), здесь — только формат и лимит.
const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(MAX_EVENT_TAGS, `Можно выбрать не более ${MAX_EVENT_TAGS} тегов`)
  .transform((tags) => Array.from(new Set(tags)))
  .optional()

// 🔹 Базовая схема события (адреса необязательны на уровне полей:
// для online они игнорируются, для offline/sport требуются в superRefine).
const eventBaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  theme: z.string().max(50).optional(),
  format: eventFormatSchema.optional(),
  subcategory: subcategorySchema.optional(),
  city: citySchema,
  addressPublic: addressPublicSchema.optional(),
  addressPrivate: addressPrivateSchema.optional(),
  startsAt: z.string().datetime('Must be ISO 8601 format'), // "2026-06-15T18:00:00Z"
  endsAt: z.string().datetime().optional(),
  maxGuests: z.number().int().min(1).max(100).optional(),
  durationMinutes: z.number().int().min(15).max(720).optional(),
  waitlistEnabled: z.boolean().optional(),
  plusOneEnabled: z.boolean().optional(),
  rules: z.record(z.string(), z.any()).optional(), // JSONB для гибких правил
  houseRules: z.string().trim().max(1000).optional(),
  houseRulesChips: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  applicationQuestion: z.string().trim().max(300).optional(),
  sportLevel: z.enum(['beginner', 'amateur', 'pro']).optional(),
  weatherDependent: z.boolean().optional(),
  budgetType: z.enum(['free', 'split']).optional(),
  budgetAmount: z.number().int().min(0).max(100000).optional(),
  budgetNote: z.string().trim().max(200).optional(),
  venueType: z.string().trim().max(50).optional(),
  platform: z.string().trim().max(50).optional(),
  meetingLink: meetingLinkSchema.optional(),
  participantGeo: participantGeoSchema.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  tags: tagsSchema,
})

// Создание: для offline/sport адреса обязательны, для online — игнорируются.
export const createEventSchema = eventBaseSchema.superRefine((data, ctx) => {
  if (data.format === 'online') return
  if (!data.addressPublic) {
    ctx.addIssue({
      code: 'custom',
      path: ['addressPublic'],
      message: 'Укажите публичный адрес',
    })
  }
  if (!data.addressPrivate) {
    ctx.addIssue({
      code: 'custom',
      path: ['addressPrivate'],
      message: 'Укажите точный адрес',
    })
  }
})

// 🔹 Схема обновления (все поля опциональны, частичное обновление)
// Добавляем status (публикация/закрытие/архив). createEventSchema не имеет
// поля status (создание всегда draft), поэтому расширяем только update.
export const updateEventSchema = eventBaseSchema
  .partial()
  .extend({
    status: z.enum(['draft', 'published', 'closed', 'archived']).optional(),
  })

// 🔹 Схема для параметров маршрута (валидация UUID в URL)
export const eventIdSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
})

// 🔹 Query-схема списка событий (GET /events)
// `tag` можно передавать один или несколько раз (?tag=a&tag=b) — события
// подходят, если у них есть хотя бы один из выбранных вайбов.
const tagQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .pipe(z.array(z.string().trim().min(1).max(50)).min(1))
  .optional()

export const listEventsQuerySchema = z.object({
  status: z.string().optional(),
  district: z.string().optional(),
  theme: z.string().optional(),
  format: eventFormatSchema.optional(),
  subcategory: subcategorySchema.optional(),
  tag: tagQuerySchema,
  search: z.string().optional(),
  city: z
    .string()
    .transform(normalizeCity)
    .pipe(z.string().max(50, 'City must be at most 50 characters'))
    .optional(),
  // ?local=1 — только онлайн-события с participantGeo='city' в своём городе.
  local: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((value) => value === '1' || value === 'true'),
  limit: z.coerce.number().int().positive('Limit must be a positive integer').optional(),
})

// 🔹 Экспортируем типы для TypeScript (автовывод из Zod-схем)
// Эти типы теперь можно импортировать в service.ts и handler.ts
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventIdParams = z.infer<typeof eventIdSchema>