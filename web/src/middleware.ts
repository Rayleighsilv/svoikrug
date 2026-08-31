import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Имя cookie с access-токеном (его ставит бэкенд в handler.ts).
const ACCESS_TOKEN_COOKIE = 'accessToken'

// Приватные маршруты: требуют наличия accessToken. Для начала — профиль и
// создание/редактирование событий. Регулярки покрывают и вложенные пути.
const PRIVATE_PATTERNS = [
  /^\/profile(?:\/.*)?$/,
  /^\/events\/new(?:\/.*)?$/,
  /^\/events\/edit(?:\/.*)?$/,
]

// Страницы входа/регистрации: при уже существующем токене уводим на главную.
const AUTH_PAGES = ['/login', '/register']

// Middleware — ТОЛЬКО проверка факта наличия cookie, без обращения к бэкенду
// и без валидации JWT. Это первый слой защиты; валидность токена — задача API.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasAccessToken = !!req.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  // 1) Приватные маршруты: нет cookie → на /login?from=<исходный url>
  const isPrivate = PRIVATE_PATTERNS.some((re) => re.test(pathname))
  if (isPrivate && !hasAccessToken) {
    const loginUrl = new URL('/login', req.url)
    // Сохраняем исходный URL (path + query), чтобы вернуть пользователя после входа.
    const from = pathname + (req.nextUrl.search || '')
    loginUrl.searchParams.set('from', from)
    return NextResponse.redirect(loginUrl)
  }

  // 2) /login и /register: уже авторизован → на главную
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (isAuthPage && hasAccessToken) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Ограничиваем область действия middleware только нужными маршрутами.
  // Публичные (/', /events, /events/[id], /test-*) сюда не попадают и не трогаются.
  matcher: [
    '/profile/:path*',
    '/events/new/:path*',
    '/events/edit/:path*',
    '/login',
    '/register',
  ],
}
