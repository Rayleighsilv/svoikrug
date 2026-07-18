import { z } from 'zod'

// ─── Схема регистрации ──────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-ZА-Я]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-zа-я]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  nickname: z.string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(30, 'Nickname must be at most 30 characters')
    .regex(/^[a-zA-Zа-яА-Я0-9_-]+$/, 'Nickname can contain letters, digits, underscore and dash')
    .optional(),
})

// ─── Схема логина ───────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// ─── Схема refresh (опционально, если токен передаётся в body) ──
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
})

// ─── Экспорт типов ──────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>