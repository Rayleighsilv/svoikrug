import { FastifyInstance } from 'fastify'
import { FeedHandler } from './handler'

export function feedRoutes(fastify: FastifyInstance, handler: FeedHandler) {
  fastify.get<{ Querystring: { limit?: string; city?: string } }>(
    '/feed/events',
    { preHandler: [fastify.authenticate] },
    handler.getEvents.bind(handler),
  )
}
