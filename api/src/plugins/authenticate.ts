import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}

export default fp(async function authenticatePlugin(fastify: FastifyInstance) {
  // Мягкая проверка: если токен есть и валиден — выставляем userId, иначе
  // оставляем запрос анонимным. Нужна для публичных страниц, которые
  // показывают дополнительные данные авторизованным пользователям.
  fastify.decorate(
    'authenticateOptional',
    async function (request: FastifyRequest) {
      let token: string | undefined

      const authHeader = request.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
      if (!token) {
        token = request.cookies?.accessToken
      }
      if (!token) return

      try {
        const decoded = fastify.jwt.verify<{ sub: string }>(token)
        request.userId = decoded.sub
      } catch {
        // Невалидный или истёкший токен не мешает смотреть публичные данные.
      }
    },
  )

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      let token: string | undefined

      // 1. Ищем токен в Authorization header
      const authHeader = request.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }

      // 2. Если нет — ищем в cookies
      if (!token) {
        token = request.cookies?.accessToken
      }

      // 3. Если токен не найден — 401
      if (!token) {
        return reply.code(401).send({
          error: true,
          message: 'Unauthorized',
          code: 'NO_TOKEN',
        })
      }

      // 4. Верифицируем токен
      try {
        const decoded = fastify.jwt.verify<{ sub: string }>(token)
        request.userId = decoded.sub
      } catch {
        return reply.code(401).send({
          error: true,
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        })
      }
    },
  )
})