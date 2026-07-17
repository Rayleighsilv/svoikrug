import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyFormbody from '@fastify/formbody'
import { z, ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import { EventService } from './modules/events/service'
import { EventHandler } from './modules/events/handler'

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

// Создаём адаптер для прямого подключения к PostgreSQL
// Примечание: prisma.config.ts создаёт свой экземпляр адаптера для CLI-команд (migrate, generate)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

// ─── Zod-схемы для debug-роутов ───────────────────────────────

const createUserSchema = z.object({
  email: z.string().email(),
  nickname: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
})

const deleteUserParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
})

// ─── Глобальный error handler ─────────────────────────────────

server.setErrorHandler((error, _request, reply) => {
  server.log.error({ err: error }, 'Unhandled error')

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
      // TODO: заменить 'temp_secret' на process.env.JWT_SECRET в проде без fallback
      secret: process.env.JWT_SECRET || 'temp_secret',
    })

    // Body parser — необходим для request.body в Fastify v5
    await server.register(fastifyFormbody)

    // ─── Debug-роуты ──────────────────────────────────────────

    server.post('/debug/create-user', async (request, reply) => {
      const parsed = createUserSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid data',
          details: parsed.error.issues,
        })
      }
      const { email, nickname, phone } = parsed.data

      try {
        const user = await prisma.user.create({
          data: {
            email,
            phone: phone || null,
            passwordHash: 'temp_hash_for_debug', // Только для отладки!
            profile: {
              create: {
                nickname: nickname || `user_${Date.now()}`,
                trustScore: 100,
              },
            },
          },
          include: {
            profile: true,
          },
        })
        return { success: true, user }
      } catch (err) {
        server.log.error('Create user failed: ' + String(err))
        return reply.code(400).send({
          success: false,
          error: 'User already exists or invalid data',
        })
      }
    })

    server.get('/debug/users', async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              nickname: true,
              trustScore: true,
              isVerified: true,
            },
          },
        },
      })
      return { users }
    })

    server.get('/', async () => {
      return { message: 'SvoiKrug API работает! 🚀', status: 'ok' }
    })

    server.delete('/debug/users/:id', async (request, reply) => {
      const parsed = deleteUserParamsSchema.safeParse(request.params)
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid user ID format',
          details: parsed.error.issues,
        })
      }
      const { id } = parsed.data

      try {
        await prisma.user.delete({ where: { id } })
        return { success: true, message: 'User deleted' }
      } catch (err) {
        server.log.error('Delete user failed: ' + String(err))
        return reply.code(400).send({ success: false, error: 'User not found or already deleted' })
      }
    })

    // ─── Events-роуты ─────────────────────────────────────────

    const eventService = new EventService(prisma)
    const eventHandler = new EventHandler(eventService)

    server.post('/events', eventHandler.create.bind(eventHandler))
    server.get('/events/:id', eventHandler.getById.bind(eventHandler))
    server.get('/events', eventHandler.list.bind(eventHandler))
    server.patch('/events/:id', eventHandler.update.bind(eventHandler))
    server.delete('/events/:id', eventHandler.delete.bind(eventHandler))

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