import { z } from 'zod'

// Валидация параметров роута RSVP.
// Переиспользуем схему id события из модуля events.
export { eventIdSchema as rsvpParamsSchema } from '../events/schema'

// Тело POST /events/:id/mark-attendance — массовая отметка посещаемости.
export const markAttendanceSchema = z.object({
  userIds: z.array(z.string().uuid('Invalid user ID')).default([]),
})

// Параметры approve/reject заявки гостя.
export const guestReviewParamsSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
  userId: z.string().uuid('Invalid user ID format'),
})
