import { FastifyInstance } from 'fastify'
import { AuthHandler } from './handler'

export function authRoutes(fastify: FastifyInstance, handler: AuthHandler) {
  // Строгие лимиты для auth-эндпоинтов (защита от брутфорса/спама)
  fastify.post(
    '/auth/register',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    handler.register.bind(handler),
  )
  fastify.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    handler.login.bind(handler),
  )
  fastify.post(
    '/auth/refresh',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    handler.refresh.bind(handler),
  )
  fastify.post('/auth/logout', handler.logout.bind(handler))
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, handler.me.bind(handler))
}
