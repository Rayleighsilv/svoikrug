import { FastifyInstance } from 'fastify'
import { UsersHandler } from './handler'

export function userRoutes(fastify: FastifyInstance, handler: UsersHandler) {
  fastify.get<{ Params: { id: string } }>('/users/:id', handler.getById.bind(handler))
  fastify.patch<{ Body: { nickname?: string; bio?: string; district?: string; avatarUrl?: string } }>(
    '/users/me/profile',
    { preHandler: [fastify.authenticate] },
    handler.updateProfile.bind(handler),
  )
}
