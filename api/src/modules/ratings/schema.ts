import { z } from 'zod'

// Валидация параметров маршрута.
export const eventIdParamSchema = z.object({
  id: z.string().uuid('Invalid event ID format'),
})

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
})

// Тело POST /events/:id/ratings
export const createRatingSchema = z.object({
  ratedUserId: z.string().uuid('Invalid rated user ID'),
  score: z.number().int().min(1, 'Score must be between 1 and 5').max(5),
  comment: z.string().max(1000).optional(),
})
