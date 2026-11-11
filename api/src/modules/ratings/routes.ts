import { FastifyInstance } from 'fastify'
import { RatingHandler } from './handler'

export function ratingRoutes(fastify: FastifyInstance, handler: RatingHandler) {
  fastify.post<{
    Params: { id: string }
    Body: { ratedUserId: string; score: number; tagSlug: string; comment?: string }
  }>(
    '/events/:id/ratings',
    { preHandler: [fastify.authenticate] },
    handler.create.bind(handler),
  )
  fastify.get('/users/me/signals', { preHandler: [fastify.authenticate] }, handler.signals.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/ratings', handler.list.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/rating-summary', handler.summary.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/tags', handler.listTags.bind(handler))
}
