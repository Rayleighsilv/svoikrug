import { FastifyInstance } from 'fastify'
import { TagsHandler } from './handler'

export function tagRoutes(fastify: FastifyInstance, handler: TagsHandler) {
  fastify.get('/tags', handler.list.bind(handler))
}
