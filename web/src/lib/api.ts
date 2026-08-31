/**
 * Базовый HTTP-клиент поверх fetch с прозрачным авто-рефрешем access-токена.
 *
 * Бэкенд отдаёт JSON-ответы единого формата:
 *   успех:  { success: true, ...данные }
 *   ошибка: { error: true, message, code?, details? }
 *
 * Клиент всегда отправляет credentials: 'include', чтобы браузер прикреплял
 * httpOnly cookie (accessToken/refreshToken) к каждому запросу. Токены НЕ
 * читаются и НЕ пишутся вручную — только httpOnly cookies.
 *
 * Авто-рефреш:
 *   - При 401 с кодом INVALID_TOKEN / NO_TOKEN вызывается POST /auth/refresh.
 *   - Если refresh успешен (2xx) — исходный запрос повторяется ровно один раз.
 *   - Если refresh упал — пользователь перекидывается на /login (при загрузке
 *     /login AuthProvider заново вызовет GET /auth/me, тот вернёт 401 и
 *     сбросит user в null — состояние в AuthContext очищается само).
 *   - Параллельные запросы, получившие 401, делят ОДИН refresh-запрос
 *     (очередь промисов), чтобы не наплодить лишних POST /auth/refresh.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const REFRESH_URL = '/auth/refresh'
// Коды 401, при которых стоит попытаться обновить access-токен.
// (NO_TOKEN — нет токена, INVALID_TOKEN — просрочен/невалиден.)
const REFRESH_TRIGGER_CODES = new Set(['INVALID_TOKEN', 'NO_TOKEN'])

// Промис «текущего» refresh-запроса. Пока он висит, все последующие 401-ы
// ждут его результат, а не запускают новый запрос (защита от гонок).
let refreshPromise: Promise<boolean> | null = null

type ApiError = {
  status: number
  code?: string
  message?: string
  details?: unknown
}

type ApiErrorPayload = {
  code?: string
  message?: string
  details?: unknown
}

// Выполняет fetch и возвращает { response, data }. Используется и для обычных
// запросов, и для самого refresh. Refresh вызывает напрямую этот хелпер, а не
// request(), поэтому не попадает в собственную логику авто-рефреша (нет рекурсии).
async function rawFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: T }> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // ← критично для httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  let data: T
  try {
    data = await response.json()
  } catch {
    data = {} as T
  }

  return { response, data }
}

// Очистка сессии, когда refresh неудачен: перекидываем на /login.
// На самой /login ничего не перезагружаем — иначе уходим в цикл редиректов
// (checkAuth на /login тоже получит 401). Полная перезагрузка страницы
// приводит к тому, что AuthProvider заново вызывает /auth/me, тот отдаёт 401
// и сбрасывает user → null.
function handleRefreshFailure() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

// Один «общий» refresh-запрос на всех параллельных гонщиков.
function refreshAccessToken(): Promise<boolean> {
  // Уже идёт refresh — дожидаемся общего результата (защита от гонок).
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      // Только cookies: refresh-токен уходит в httpOnly cookie, новые токены
      // возвращаются в Set-Cookie. Тело не требуется.
      const { response } = await rawFetch(REFRESH_URL, { method: 'POST' })
      return response.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(url: string, options: RequestInit = {}, retried = false): Promise<T> {
  const { response, data } = await rawFetch<ApiErrorPayload>(url, options)

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      code: data.code,
      message: data.message,
      details: data.details,
    }

    // Пробуем рефреш только один раз на запрос (retried) и только при 401
    // с токен-кодами. Так исключаем бесконечные циклы.
    const shouldRefresh =
      response.status === 401 &&
      !!data.code &&
      REFRESH_TRIGGER_CODES.has(data.code) &&
      !retried

    if (shouldRefresh) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        // Повторяем исходный запрос с теми же параметрами ровно один раз.
        return request<T>(url, options, true)
      }
      // Refresh не удался — сессия истекла.
      handleRefreshFailure()
    }

    throw error
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
