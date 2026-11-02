import { z } from 'zod'

// Query-схема GET /cities/suggest?q=
export const citySuggestQuerySchema = z.object({
  q: z.string().max(50, 'Query is too long').optional(),
})
