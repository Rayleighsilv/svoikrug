import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyFormbody from '@fastify/formbody'
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
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET is missing or too short. It must be at least 32 characters.')
  process.exit(1)
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
    await server.register(fastifyCors, {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    })

    await server.register(fastifyCookie, {
      secret: process.env.JWT_SECRET,
    })

    // Body parser — необходим для request.body в Fastify v5
    await server.register(fastifyFormbody)

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