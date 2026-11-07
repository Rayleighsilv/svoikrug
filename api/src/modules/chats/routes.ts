import { FastifyInstance } from 'fastify'
import { ChatHandler } from './handler'

export function chatRoutes(fastify: FastifyInstance, handler: ChatHandler) {
  fastify.get('/chats', { preHandler: [fastify.authenticate] }, handler.list.bind(handler))
  fastify.get(
    '/chats/unread-count',
    { preHandler: [fastify.authenticate] },
    handler.unreadCount.bind(handler),
  )
  fastify.get<{ Params: { id: string } }>(
    '/chats/:id',
    { preHandler: [fastify.authenticate] },
    handler.getById.bind(handler),
  )
  fastify.post<{ Params: { id: string } }>(
    '/chats/:id/messages',
    { preHandler: [fastify.authenticate] },
    handler.sendMessage.bind(handler),
  )
}
