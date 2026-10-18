import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyFormbody from '@fastify/formbody'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyHelmet from '@fastify/helmet'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import { EventService } from './modules/events/service'
import { EventHandler } from './modules/events/handler'
import { RsvpService } from './modules/rsvp/service'
import { RsvpHandler } from './modules/rsvp/handler'
import { rsvpRoutes } from './modules/rsvp/routes'
import { SubscriptionService } from './modules/subscriptions/service'
import { SubscriptionHandler } from './modules/subscriptions/handler'
import { subscriptionRoutes } from './modules/subscriptions/routes'
import { UsersService } from './modules/users/service'
import { UsersHandler } from './modules/users/handler'
import { userRoutes } from './modules/users/routes'
import { RatingService } from './modules/ratings/service'
import { RatingHandler } from './modules/ratings/handler'
import { ratingRoutes } from './modules/ratings/routes'
import { FeedService } from './modules/feed/service'
import { FeedHandler } from './modules/feed/handler'
import { feedRoutes } from './modules/feed/routes'
import { NotificationService } from './modules/notifications/service'
import { NotificationHandler } from './modules/notifications/handler'
import { notificationRoutes } from './modules/notifications/routes'
import { AuthService } from './modules/auth/service'
import { AuthHandler } from './modules/auth/handler'
import { authRoutes } from './modules/auth/routes'

import jwtPlugin from './plugins/jwt'
import authenticatePlugin from './plugins/authenticate'

import { AppError } from './common/errors'

import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const server = Fastify({ logger: true })

// Проверяем, что DATABASE_URL задан перед созданием адаптера
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment')
  process.exit(1)
}

// Проверяем, что JWT_SECRET задан и имеет достаточную длину
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('❌ JWT_SECRET is missing or too short. It must be at least 32 characters.')
  process.exit(1)
}

// COOKIE_SECRET может быть отдельным от JWT_SECRET; если он задан — тоже ≥32 символов.
const cookieSecret = process.env.COOKIE_SECRET || jwtSecret
if (!cookieSecret || cookieSecret.length < 32) {
  console.error('❌ COOKIE_SECRET is missing or too short. It must be at least 32 characters.')
  process.exit(1)
}

// В production запрещаем запуск с дефолтными/небезопасными секретами
if (process.env.NODE_ENV === 'production') {
  const unsafe = (s: string) =>
    s.includes('change_me') ||
    ['secret', 'changeme', 'svoikrug_dev_secret_change_me_in_prod'].includes(s)
  if (unsafe(jwtSecret) || unsafe(cookieSecret)) {
    console.error('❌ Refusing to start in production with default/insecure secrets.')
    process.exit(1)
  }
}

// Создаём адаптер для прямого подключения к PostgreSQL
// Примечание: prisma.config.ts создаёт свой экземпляр адаптера для CLI-команд (migrate, generate)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

// ─── Глобальный error handler ─────────────────────────────────

server.setErrorHandler((error, _request, reply) => {
  // Доменные ошибки приложения (AppError) — отдаём статус и код вместо 500
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: true,
      message: error.message,
      code: error.code,
    })
  }

  if (error instanceof ZodError) {
    const zodErr = error
    return reply.code(400).send({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: zodErr.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  if (error instanceof PrismaClientKnownRequestError) {
    const prismaErrors: Record<string, { status: number; message: string }> = {
      P2002: { status: 409, message: 'Unique constraint failed' },
      P2003: { status: 400, message: 'Foreign key constraint failed' },
      P2025: { status: 404, message: 'Record not found' },
      P2021: { status: 500, message: 'Table does not exist' },
    }
    const mapped = prismaErrors[error.code]
    if (mapped) {
      return reply.code(mapped.status).send({
        error: true,
        message: mapped.message,
        code: error.code,
      })
    }
  }

  const fastifyErr = error as unknown as { validation?: unknown }
  if (fastifyErr.validation) {
    return reply.code(400).send({
      error: true,
      message: 'Request validation failed',
      details: fastifyErr.validation,
    })
  }

  // Ошибки Fastify-плагинов (например, @fastify/rate-limit → 429) несут statusCode.
  // Клиентские 4xx отдаём как есть, а не превращаем в 500.
  const err = error as { statusCode?: number; code?: string; message?: string }
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return reply.code(err.statusCode).send({
      error: true,
      message: err.message || 'Request error',
      code: err.code,
    })
  }

  server.log.error({ err: error }, 'Unhandled error')
  return reply.code(500).send({
    error: true,
    message: 'Internal server error',
  })
})

// ─── Запуск сервера ───────────────────────────────────────────

const PORT = Number(process.env.PORT) || 4000

const start = async () => {
  try {
    // Плагины
    // Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS и др.
    await server.register(fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
    // Отключаем X-Powered-By
    server.addHook('onSend', async (_request, reply, payload) => {
      reply.removeHeader('X-Powered-By')
      return payload
    })

    // CORS: в production разрешаем только прод-домен
    const allowedOrigins =
      process.env.NODE_ENV === 'production'
        ? ['https://svoikrug.ru']
        : ['http://localhost:3000', 'http://127.0.0.1:3000']

    await server.register(fastifyCors, {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    })

    await server.register(fastifyCookie, {
      secret: cookieSecret,
    })

    // Body parser — необходим для request.body в Fastify v5
    await server.register(fastifyFormbody)

    // Rate limiting: глобально 100 запросов/мин на IP (in-memory).
    // На auth-роутах лимиты строже (см. modules/auth/routes.ts).
    await server.register(fastifyRateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute',
    })

    // ─── JWT-плагин и authenticate middleware ──────────────────
    await server.register(jwtPlugin)
    await server.register(authenticatePlugin)

    // ─── Auth-роуты ────────────────────────────────────────────
    const jwtAdapter: import('./modules/auth/service').JwtInstance = {
      sign: (payload, opts) => server.jwt.sign(payload, opts || {}),
      verify: <T = unknown>(token: string) => server.jwt.verify(token) as T,
    }
    const authService = new AuthService(prisma, jwtAdapter)
    const authHandler = new AuthHandler(authService)
    authRoutes(server, authHandler)

    // ─── Root ──────────────────────────────────────────────────

    server.get('/', async () => {
      return { message: 'SvoiKrug API работает! 🚀', status: 'ok' }
    })

    // ─── Events-роуты ─────────────────────────────────────────

    const eventService = new EventService(prisma)
    const eventHandler = new EventHandler(eventService)

    server.post('/events', { preHandler: [server.authenticate] }, eventHandler.create.bind(eventHandler))
    server.get('/events/:id', eventHandler.getById.bind(eventHandler))
    server.get('/events', eventHandler.list.bind(eventHandler))
    server.patch<{ Params: { id: string }; Body: any }>('/events/:id', { preHandler: [server.authenticate] }, eventHandler.update.bind(eventHandler))
    server.delete<{ Params: { id: string } }>('/events/:id', { preHandler: [server.authenticate] }, eventHandler.delete.bind(eventHandler))

    // ─── RSVP-роуты ──────────────────────────────────────────────
    const rsvpService = new RsvpService(prisma)
    const rsvpHandler = new RsvpHandler(rsvpService)
    rsvpRoutes(server, rsvpHandler)

    // ─── Подписки ──────────────────────────────────────────────
    const subscriptionService = new SubscriptionService(prisma)
    const subscriptionHandler = new SubscriptionHandler(subscriptionService)
    subscriptionRoutes(server, subscriptionHandler)

    // ─── Публичный профиль пользователя ─────────────────────────
    const usersService = new UsersService(prisma)
    const usersHandler = new UsersHandler(usersService)
    userRoutes(server, usersHandler)

    // ─── Рейтинги ──────────────────────────────────────────────
    const ratingService = new RatingService(prisma)
    const ratingHandler = new RatingHandler(ratingService)
    ratingRoutes(server, ratingHandler)

    // ─── Лента подписок ────────────────────────────────────────
    const feedService = new FeedService(prisma)
    const feedHandler = new FeedHandler(feedService)
    feedRoutes(server, feedHandler)

    // ─── Уведомления ──────────────────────────────────────────
    const notificationService = new NotificationService(prisma)
    const notificationHandler = new NotificationHandler(notificationService)
    notificationRoutes(server, notificationHandler)

    // ─── Health check ─────────────────────────────────────────

    server.get('/health', async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'ok', database: 'connected' }
      } catch {
        return { status: 'error', database: 'disconnected' }
      }
    })

    // Запуск сервера
    await server.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Бэкенд запущен: http://localhost:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()