import { FastifyInstance } from 'fastify'
import { UsersHandler } from './handler'

export function userRoutes(fastify: FastifyInstance, handler: UsersHandler) {
  fastify.get<{ Params: { id: string } }>('/users/:id', handler.getById.bind(handler))
}
