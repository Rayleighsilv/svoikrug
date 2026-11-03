import { z } from 'zod'
import { normalizeCity } from '../../common/city'

// Валидация параметров маршрута (UUID пользователя в URL).
export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
})

// Город профиля: нормализуем и ограничиваем длину (пустая строка → null в сервисе).
const profileCitySchema = z
  .string()
  .transform(normalizeCity)
  .pipe(z.string().max(50, 'City must be at most 50 characters'))

// Дата рождения в формате YYYY-MM-DD. Пустая строка очищает значение.
const birthDateSchema = z
  .string()
  .refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Дата рождения должна быть в формате YYYY-MM-DD',
  )
  .refine((value) => {
    if (!value) return true
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) return false
    // Отсекаем несуществующие даты (например, 31 февраля) и будущее.
    if (date.toISOString().slice(0, 10) !== value) return false
    if (date > new Date()) return false
    return date.getUTCFullYear() >= 1900
  }, 'Некорректная дата рождения')

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
  city: profileCitySchema.optional(),
  birthDate: birthDateSchema.optional(),
  avatarUrl: z.string().max(2048, 'Avatar URL is too long').optional(),
})
