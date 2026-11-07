import { FastifyInstance } from 'fastify'
import { TagsHandler } from './handler'

export function tagRoutes(fastify: FastifyInstance, handler: TagsHandler) {
  fastify.get('/tags', handler.list.bind(handler))
  // Алиас по ТЗ: /vibes?format=offline.
  fastify.get('/vibes', handler.list.bind(handler))
}
