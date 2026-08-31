// api/src/modules/events/schema.ts
import { z } from 'zod'

// 🔹 Схема создания события
export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  theme: z.string().max(50).optional(),
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

// 🔹 Экспортируем типы для TypeScript (автовывод из Zod-схем)
// Эти типы теперь можно импортировать в service.ts и handler.ts
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventIdParams = z.infer<typeof eventIdSchema>