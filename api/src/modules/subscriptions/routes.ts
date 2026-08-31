import { FastifyInstance } from 'fastify'
import { SubscriptionHandler } from './handler'

export function subscriptionRoutes(fastify: FastifyInstance, handler: SubscriptionHandler) {
  fastify.post<{ Params: { id: string } }>('/users/:id/follow', { preHandler: [fastify.authenticate] }, handler.follow.bind(handler))
  fastify.delete<{ Params: { id: string } }>('/users/:id/follow', { preHandler: [fastify.authenticate] }, handler.unfollow.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/followers', handler.followers.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/following', handler.following.bind(handler))
  fastify.get<{ Params: { id: string } }>('/users/:id/follow-status', { preHandler: [fastify.authenticate] }, handler.followStatus.bind(handler))
}
