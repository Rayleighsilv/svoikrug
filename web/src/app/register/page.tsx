'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { validateRegister, registerErrorMessage, type RegisterErrors } from '@/lib/validation'

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)

  // Уже авторизованного пользователя (после окончания загрузки сессии)
  // уводим на главную, форму не показываем — чтобы не «мигала» при загрузке.
  useEffect(() => {
    if (!loading && user) {
      router.replace('/')
    }
  }, [loading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Клиентская валидация до отправки запроса
    const validation = validateRegister(email, password, nickname)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setEmailTaken(false)
      return
    }

    setErrors({})
    setEmailTaken(false)
    setSubmitting(true)
    try {
      await register(email, password, nickname || undefined)
      router.replace('/')
    } catch (err) {
      const parsed = registerErrorMessage(err)
      if (parsed.code === 'EMAIL_TAKEN') {
        setEmailTaken(true)
      } else if (parsed.code === 'VALIDATION_ERROR' && parsed.fields) {
        setErrors({ ...parsed.fields })
      } else {
        setErrors({ form: parsed.message || 'Произошла ошибка. Попробуйте ещё раз.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Загрузка...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Регистрация</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 8 символов, заглавная и цифра"
              autoComplete="new-password"
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nickname">
              Ник <span className="text-gray-400">(необязательно)</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2–30 символов: буквы, цифры, _ или -"
              className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${
                errors.nickname ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.nickname && <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>}
          </div>

          {errors.form && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{errors.form}</div>
          )}

          {emailTaken && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded">
              Этот email уже зарегистрирован.{' '}
              <Link href="/login" className="font-semibold underline">
                Войти
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  )
}
