// 🔹 Добавь эти импорты в начало файла
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

// Импорты нашего модуля events
import { EventService } from './modules/events/service'
import { EventHandler } from './modules/events/handler'

import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()


const server = Fastify({ logger: true })


// Создаём адаптер для прямого подключения к PostgreSQL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
})

// Передаём адаптер в PrismaClient
const prisma = new PrismaClient({ adapter })

// 🔹 Health check + проверка подключения к БД
server.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  } catch (err) {
    server.log.error('DB connection failed:', err)
    return { status: 'error', database: 'disconnected' }
  }
})

// 🔹 Создать тестового пользователя — ОБНОВЛЕНО под новую схему
server.post('/debug/create-user', async (request, reply) => {
  const body = request.body as { 
    email: string
    nickname?: string  // ← было name, стало nickname
    phone?: string
  }
  const { email, nickname, phone } = body

  try {
    // Создаём пользователя + профиль в одной транзакции
    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        passwordHash: 'temp_hash_for_debug', // ⚠️ Только для отладки!
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
    server.log.error('Create user failed:', err)
    return reply.code(400).send({ 
      success: false, 
      error: 'User already exists or invalid data' 
    })
  }
})


// 🔹 Получить всех пользователей (для отладки) — ОБНОВЛЕНО под новую схему
server.get('/debug/users', async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
      // Подтягиваем профиль, чтобы показать nickname
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


// 🔹 Старый маршрут (для совместимости)
server.get('/', async () => {
  return { message: 'SvoiKrug API работает! 🚀', status: 'ok' }
})


// 🔹 Удалить пользователя по ID
server.delete('/debug/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }

  try {
    await prisma.user.delete({ where: { id } })
    return { success: true, message: 'User deleted' }
  } catch (err) {
    server.log.error('Delete user failed:', err)
    return reply.code(400).send({ success: false, error: 'User not found or already deleted' })
  }
})


// 🔹 Запуск сервера
const PORT = Number(process.env.PORT) || 4000



// 🔹 Глобальный error handler — типобезопасная версия
server.setErrorHandler((error, request, reply) => {
  // ✅ Правильный лог для Fastify: объект ошибки + сообщение
  server.log.error({ err: error }, 'Unhandled error')

  // Zod валидация
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  // Prisma ошибки
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

  // Fastify ошибки валидации (если используешь schema в роутах)
  if (error.validation) {
    return reply.code(400).send({
      error: true,
      message: 'Request validation failed',
      details: error.validation,
    })
  }

  // Дефолт: 500 для неизвестных ошибок
  return reply.code(500).send({
    error: true,
    message: 'Internal server error',
    // В продакшене не отдавай stacktrace клиенту!
    // ...(process.env.NODE_ENV === 'development' && { stack: (error as Error).stack }),
  })
})




const start = async () => {
  try {
    // 🔹 Плагины
    await server.register(fastifyCors, {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    })
    await server.register(fastifyCookie, { secret: process.env.JWT_SECRET })

    // 🔹 Инициализируем сервис и хендлер модуля events
    const eventService = new EventService(prisma)
    const eventHandler = new EventHandler(eventService)

    // 🔹 Регистрируем роуты модуля events
    server.post('/events', eventHandler.create.bind(eventHandler))
    server.get('/events/:id', eventHandler.getById.bind(eventHandler))
    server.get('/events', eventHandler.list.bind(eventHandler))
    server.patch('/events/:id', eventHandler.update.bind(eventHandler))
    server.delete('/events/:id', eventHandler.delete.bind(eventHandler))

    // 🔹 Debug-роуты (оставляем для тестов)
    server.get('/health', async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'ok', database: 'connected' }
      } catch {
        return { status: 'error', database: 'disconnected' }
      }
    })
    
    // ... остальные debug-роуты ...

    // 🔹 Запуск сервера
    await server.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Бэкенд запущен: http://localhost:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
