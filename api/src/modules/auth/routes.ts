import { FastifyInstance } from 'fastify'
import { AuthHandler } from './handler'

export function authRoutes(fastify: FastifyInstance, handler: AuthHandler) {
  fastify.post('/auth/register', handler.register.bind(handler))
  fastify.post('/auth/login', handler.login.bind(handler))
  fastify.post('/auth/refresh', handler.refresh.bind(handler))
  fastify.post('/auth/logout', handler.logout.bind(handler))
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, handler.me.bind(handler))
}
