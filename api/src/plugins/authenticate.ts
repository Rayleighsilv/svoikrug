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
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}

export default fp(async function authenticatePlugin(fastify: FastifyInstance) {
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