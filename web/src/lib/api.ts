/**
 * Базовый HTTP-клиент поверх fetch.
 *
 * Бэкенд отдаёт JSON-ответы единого формата:
 *   успех:  { success: true, ...данные }
 *   ошибка: { error: true, message, code?, details? }
 *
 * Клиент всегда отправляет credentials: 'include', чтобы браузер прикреплял
 * httpOnly cookie (accessToken/refreshToken) к каждому запросу, и нормализует
 * ошибки в объект { status, code, message, details } для единообразного показа.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // ← критично для httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw {
      status: response.status,
      code: data.code,
      message: data.message,
      details: data.details,
    }
  }

  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
