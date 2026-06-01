// api/src/modules/events/handler.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { EventService } from './service'
import { createEventSchema, updateEventSchema, eventIdSchema } from './schema'

export class EventHandler {
  constructor(private service: EventService) {}

  // POST /events — создать событие
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 🔹 Валидация тела запроса через Zod
      const validated = createEventSchema.parse(request.body)
      
      // 🔹 hostId берём из авторизации (пока заглушка)
      const hostId = 'temp-host-id-for-dev' // TODO: заменить на request.user.id после auth
      
      const event = await this.service.createEvent(hostId, validated)
      return reply.code(201).send({ success: true, event })
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ 
          error: true, 
          message: 'Validation failed', 
          details: err.errors 
        })
      }
      throw err // передаём в глобальный error handler
    }
  }

  // GET /events/:id — получить событие по ID
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = eventIdSchema.parse(request.params)
    
    const event = await this.service.getEventById(id)
    if (!event) {
      return reply.code(404).send({ error: true, message: 'Event not found' })
    }
    return { success: true, event }
  }

  // GET /events — список событий с фильтрами
  async list(request: FastifyRequest<{ Querystring: { status?: string; district?: string; limit?: string } }>) {
    const filters = {
      status: request.query.status,
      district: request.query.district,
      limit: request.query.limit ? parseInt(request.query.limit, 10) : undefined,
    }
    return { success: true, events: await this.service.listEvents(filters) }
  }

  // PATCH /events/:id — обновить событие
  async update(request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const { id } = eventIdSchema.parse(request.params)
    const validated = updateEventSchema.parse(request.body)
    const hostId = 'temp-host-id-for-dev' // TODO: auth

    try {
      const event = await this.service.updateEvent(id, hostId, validated)
      return { success: true, event }
    } catch (err: any) {
      if (err.message === 'Event not found or access denied') {
        return reply.code(403).send({ error: true, message: err.message })
      }
      throw err
    }
  }

  // DELETE /events/:id — удалить событие
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = eventIdSchema.parse(request.params)
    const hostId = 'temp-host-id-for-dev' // TODO: auth

    try {
      await this.service.deleteEvent(id, hostId)
      return { success: true, message: 'Event deleted' }
    } catch (err: any) {
      if (err.message === 'Event not found or access denied') {
        return reply.code(403).send({ error: true, message: err.message })
      }
      throw err
    }
  }
}