import { z } from 'zod'

// Валидация параметров маршрута (UUID пользователя в URL).
export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
})
