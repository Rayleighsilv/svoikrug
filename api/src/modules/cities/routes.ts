import { FastifyInstance } from 'fastify'
import { CitiesHandler } from './handler'

export function cityRoutes(fastify: FastifyInstance, handler: CitiesHandler) {
  fastify.get<{ Querystring: { q?: string } }>(
    '/cities/suggest',
    handler.suggest.bind(handler),
  )
}
