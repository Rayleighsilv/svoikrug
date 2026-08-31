import { FastifyRequest, FastifyReply } from 'fastify'
import { RsvpService } from './service'
import { rsvpParamsSchema } from './schema'

export class RsvpHandler {
  constructor(private service: RsvpService) {}

  // POST /events/:id/rsvp — записаться в гости
  async join(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = rsvpParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const guest = await this.service.join(userId, id)
    return reply.code(201).send({ success: true, guest })
  }

  // DELETE /events/:id/rsvp — отменить свою запись
  async cancel(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = rsvpParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const result = await this.service.cancel(userId, id)
    return result
  }

  // GET /events/:id/guests — список гостей
  async listGuests(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = rsvpParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const guests = await this.service.listGuests(id)
    return { success: true, guests }
  }
}
