import { z } from 'zod'

export const chatIdSchema = z.object({
  id: z.string().uuid('Invalid chat ID format'),
})

export const sendMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Сообщение не может быть пустым')
    .max(2000, 'Сообщение не должно превышать 2000 символов'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
