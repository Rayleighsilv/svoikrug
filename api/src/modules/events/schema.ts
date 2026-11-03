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

// 🔹 Схема создания события
export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  theme: z.string().max(50).optional(),
  city: citySchema,
  addressPublic: addressPublicSchema,
  addressPrivate: addressPrivateSchema,
  startsAt: z.string().datetime('Must be ISO 8601 format'), // "2026-06-15T18:00:00Z"
  endsAt: z.string().datetime().optional(),
  maxGuests: z.number().int().min(1).max(100).optional(),
  rules: z.record(z.string(), z.any()).optional(), // JSONB для гибких правил
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

// 🔹 Схема обновления (все поля опциональны, частичное обновление)
// Добавляем status (публикация/закрытие/архив). createEventSchema не имеет
// поля status (создание всегда draft), поэтому расширяем только update.
export const updateEventSchema = createEventSchema
  .partial()
  .extend({
    status: z.enum(['draft', 'published', 'closed', 'archived']).optional(),
  })

// 🔹 Схема для параметров маршрута (валидация UUID в URL)
export const eventIdSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
})

// 🔹 Query-схема списка событий (GET /events)
export const listEventsQuerySchema = z.object({
  status: z.string().optional(),
  district: z.string().optional(),
  theme: z.string().optional(),
  search: z.string().optional(),
  city: z
    .string()
    .transform(normalizeCity)
    .pipe(z.string().max(50, 'City must be at most 50 characters'))
    .optional(),
  limit: z.coerce.number().int().positive('Limit must be a positive integer').optional(),
})

// 🔹 Экспортируем типы для TypeScript (автовывод из Zod-схем)
// Эти типы теперь можно импортировать в service.ts и handler.ts
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventIdParams = z.infer<typeof eventIdSchema>