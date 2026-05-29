import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import fastifyCors from '@fastify/cors'

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

// 🔹 Создать тестового пользователя (для отладки)
server.post('/debug/create-user', async (request, reply) => {
  const body = request.body as { email: string; name?: string; rating?: string | number }
  const { email, name, rating } = body

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: name || 'Test User',
        // rating: 100
        rating: rating ? Number(rating) : 100
      }
    })
    return { success: true, user }
  } catch (err) {
    server.log.error('Create user failed:', err)
    return reply.code(400).send({ success: false, error: 'User already exists or invalid data' })
  }
})

// 🔹 Получить всех пользователей (для отладки)
server.get('/debug/users', async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, rating: true }
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
const PORT = Number(process.env.PORT) || 3001

const start = async () => {
  try {

    // 🔹 РЕГИСТРИРУЕМ CORS ЗДЕСЬ (внутри async функции, где await разрешён)
    await server.register(fastifyCors, {
      origin: 'http://localhost:3000',
      credentials: true,
      // 🔹 Разрешаем дополнительные методы
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })

    await server.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Бэкенд запущен: http://localhost:${PORT}`)
    console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
