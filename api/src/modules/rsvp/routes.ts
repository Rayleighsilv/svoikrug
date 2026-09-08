import { FastifyInstance } from 'fastify'
import { RsvpHandler } from './handler'

export function rsvpRoutes(fastify: FastifyInstance, handler: RsvpHandler) {
  fastify.post<{ Params: { id: string } }>('/events/:id/rsvp', { preHandler: [fastify.authenticate] }, handler.join.bind(handler))
  fastify.delete<{ Params: { id: string } }>('/events/:id/rsvp', { preHandler: [fastify.authenticate] }, handler.cancel.bind(handler))
  fastify.get<{ Params: { id: string } }>('/events/:id/guests', handler.listGuests.bind(handler))
  fastify.post<{ Params: { id: string }; Body: { userIds?: string[] } }>('/events/:id/mark-attendance', { preHandler: [fastify.authenticate] }, handler.markAttendance.bind(handler))
}
