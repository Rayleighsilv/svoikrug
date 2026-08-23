// Клиентская валидация, повторяющая правила Zod на бэкенде
// (api/src/modules/auth/schema.ts). Правила email/пароля/ника должны
// точно совпадать с серверными, чтобы ошибки не «расходились».

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UPPERCASE_RE = /[A-ZА-Я]/
const LOWERCASE_RE = /[a-zа-я]/
const DIGIT_RE = /[0-9]/
const NICKNAME_RE = /^[a-zA-Zа-яА-Я0-9_-]+$/

export type RegisterErrors = {
  email?: string
  password?: string
  nickname?: string
  form?: string
}

type FieldMap = { email?: string; password?: string; nickname?: string }

export type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Введите email'
  if (email.length > 255) return 'Email слишком длинный'
  if (!EMAIL_RE.test(email)) return 'Некорректный email'
  return undefined
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Введите пароль'
  if (password.length < 8) return 'Пароль должен содержать минимум 8 символов'
  if (password.length > 128) return 'Пароль должен быть не длиннее 128 символов'
  if (!UPPERCASE_RE.test(password))
    return 'Пароль должен содержать хотя бы одну заглавную букву (латиницу или кириллицу)'
  if (!LOWERCASE_RE.test(password)) return 'Пароль должен содержать хотя бы одну строчную букву'
  if (!DIGIT_RE.test(password)) return 'Пароль должен содержать хотя бы одну цифру'
  return undefined
}

function validateNickname(nickname: string): string | undefined {
  const trimmed = nickname.trim()
  if (!trimmed) return undefined // необязательное поле
  if (trimmed.length < 2) return 'Ник должен содержать минимум 2 символа'
  if (trimmed.length > 30) return 'Ник должен быть не длиннее 30 символов'
  if (!NICKNAME_RE.test(trimmed))
    return 'Ник может содержать только буквы, цифры, дефис и подчёркивание'
  return undefined
}

export function validateRegister(email: string, password: string, nickname: string): RegisterErrors {
  const errors: RegisterErrors = {}
  const emailErr = validateEmail(email)
  const passErr = validatePassword(password)
  const nickErr = validateNickname(nickname)
  if (emailErr) errors.email = emailErr
  if (passErr) errors.password = passErr
  if (nickErr) errors.nickname = nickErr
  return errors
}

// Валидация логина — только формат/заполненность (правила стойкости пароля
// применяются при регистрации, на входе их не перепроверяем).
export function validateLogin(email: string, password: string): {
  email?: string
  password?: string
} {
  const errors: { email?: string; password?: string } = {}
  if (!email.trim()) {
    errors.email = 'Введите email'
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Некорректный email'
  }
  if (!password) {
    errors.password = 'Введите пароль'
  }
  return errors
}

// ─── Преобразование ошибок бэкенда по кодам ответа ────────────

// Сообщения деталей из бэкенда (VALIDATION_ERROR) → русский
const DETAIL_MESSAGES: Record<string, string> = {
  'Invalid email format': 'Некорректный email',
  'Password must be at least 8 characters': 'Пароль должен содержать минимум 8 символов',
  'Password must be at most 128 characters': 'Пароль должен быть не длиннее 128 символов',
  'Password must contain at least one uppercase letter':
    'Пароль должен содержать хотя бы одну заглавную букву',
  'Password must contain at least one lowercase letter':
    'Пароль должен содержать хотя бы одну строчную букву',
  'Password must contain at least one digit': 'Пароль должен содержать хотя бы одну цифру',
  'Nickname must be at least 2 characters': 'Ник должен содержать минимум 2 символа',
  'Nickname must be at most 30 characters': 'Ник должен быть не длиннее 30 символов',
  'Nickname can contain letters, digits, underscore and dash':
    'Ник может содержать только буквы, цифры, дефис и подчёркивание',
}

type ApiError = {
  status?: number
  code?: string
  message?: string
  details?: Array<{ field?: string; message?: string }>
}

const FIELDS = ['email', 'password', 'nickname'] as const

// Возвращает понятный текст по коду ответа. Для VALIDATION_ERROR раскладывает
// детали по конкретным полям. Для EMAIL_TAKEN — отдельный флаг (для ссылки на /login).
export function registerErrorMessage(err: unknown): {
  code?: string
  message?: string
  fields?: FieldMap
  emailTaken?: boolean
} {
  const e = (err || {}) as ApiError
  switch (e.code) {
    case 'EMAIL_TAKEN':
      return { code: 'EMAIL_TAKEN', message: 'Этот email уже зарегистрирован', emailTaken: true }
    case 'ACCOUNT_SUSPENDED':
      return { code: 'ACCOUNT_SUSPENDED', message: 'Аккаунт заблокирован' }
    case 'VALIDATION_ERROR': {
      const fields: FieldMap = {}
      for (const d of e.details ?? []) {
        const key = d.field as (typeof FIELDS)[number]
        if (d.field && (FIELDS as readonly string[]).includes(d.field) && d.message) {
          fields[key] = DETAIL_MESSAGES[d.message] ?? d.message
        }
      }
      if (Object.keys(fields).length > 0) {
        return { code: 'VALIDATION_ERROR', fields }
      }
      return { code: 'VALIDATION_ERROR', message: 'Проверьте правильность заполнения полей' }
    }
    default:
      return { message: e.message || 'Произошла ошибка. Попробуйте ещё раз.' }
  }
}

// Маппинг ошибок логина: коды бэкенда → понятное сообщение для пользователя.
export function loginErrorMessage(code?: string, message?: string): string {
  if (code === 'INVALID_CREDENTIALS') {
    return 'Неверный email или пароль'
  }
  if (code === 'ACCOUNT_SUSPENDED') {
    return 'Аккаунт заблокирован'
  }
  return message || 'Произошла ошибка при входе'
}
