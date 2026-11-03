import { FastifyRequest, FastifyReply } from 'fastify'
import { EventService } from './service'
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
} from './schema'

export class EventHandler {
  constructor(private service: EventService) {}

  // POST /events — создать событие
  async create(request: FastifyRequest, reply: FastifyReply) {
    const validated = createEventSchema.parse(request.body)

    const hostId = request.userId!

    const event = await this.service.createEvent(hostId, validated)
    return reply.code(201).send({ success: true, event })
  }

  // GET /events/:id — получить событие по ID
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = eventIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const event = await this.service.getEventById(id, request.userId)
    if (!event) {
      return reply.code(404).send({ error: true, message: 'Event not found' })
    }
    return { success: true, event }
  }

  // GET /events — список событий с фильтрами
  async list(
    request: FastifyRequest<{
      Querystring: {
        status?: string
        district?: string
        theme?: string
        search?: string
        limit?: string
        city?: string
      }
    }>,
    reply: FastifyReply,
  ) {
    const parsed = listEventsQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { city, ...filters } = parsed.data
    return {
      success: true,
      events: await this.service.listEvents({ ...filters, city: city || undefined }),
    }
  }

  // PATCH /events/:id — обновить событие
  async update(request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const parsedParams = eventIdSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsedParams.error.issues,
      })
    }
    const { id } = parsedParams.data

    const validated = updateEventSchema.parse(request.body)
    const hostId = request.userId!

    const event = await this.service.updateEvent(id, hostId, validated)
    return { success: true, event }
  }

  // DELETE /events/:id — удалить событие
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = eventIdSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsedParams.error.issues,
      })
    }
    const { id } = parsedParams.data

    const hostId = request.userId!

    await this.service.deleteEvent(id, hostId)
    return { success: true, message: 'Event deleted' }
  }
}