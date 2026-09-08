import { z } from 'zod'

// Валидация параметра маршрута (id уведомления).
export const notificationParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
})
