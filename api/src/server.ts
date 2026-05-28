import Fastify from 'fastify'
import dotenv from 'dotenv'

dotenv.config()

const server = Fastify({ logger: true })

// Простой маршрут для проверки
server.get('/', async (request, reply) => {
  return { message: 'SvoiKrug API работает! 🚀', status: 'ok' }
})

// Запуск сервера
const PORT = Number(process.env.PORT) || 3001

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`✅ Бэкенд запущен: http://localhost:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
