import { z } from 'zod'

// Валидация параметров маршрута (UUID пользователя в URL).
export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
})

// Тело PATCH /users/me/profile — частичное обновление профиля.
export const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(30, 'Nickname must be at most 30 characters')
    .regex(/^[a-zA-Zа-яА-Я0-9_-]+$/, 'Nickname can contain letters, digits, underscore and dash')
    .optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  district: z.string().max(100, 'District must be at most 100 characters').optional(),
  avatarUrl: z.string().max(2048, 'Avatar URL is too long').optional(),
})
