import { FastifyInstance } from 'fastify'
import { NotificationHandler } from './handler'

export function notificationRoutes(fastify: FastifyInstance, handler: NotificationHandler) {
  fastify.get<{ Querystring: { limit?: string } }>('/notifications', { preHandler: [fastify.authenticate] }, handler.list.bind(handler))
  fastify.post<{ Params: { id: string } }>('/notifications/:id/read', { preHandler: [fastify.authenticate] }, handler.markRead.bind(handler))
  fastify.post('/notifications/read-all', { preHandler: [fastify.authenticate] }, handler.markAllRead.bind(handler))
  fastify.get('/notifications/unread-count', { preHandler: [fastify.authenticate] }, handler.unreadCount.bind(handler))
}
