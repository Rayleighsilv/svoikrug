import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { EventService } from './service'
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
} from './schema'

const COVER_DIR = path.resolve(process.cwd(), 'uploads', 'events')

// Удаляем файл обложки только если он лежит в нашей папке uploads.
async function removeUploadedCover(coverUrl: string | null) {
  if (!coverUrl || !coverUrl.startsWith('/uploads/events/')) return
  try {
    await unlink(path.join(COVER_DIR, path.basename(coverUrl)))
  } catch {
    // файл мог отсутствовать — игнорируем
  }
}

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
        format?: string
        subcategory?: string
        tag?: string
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

    const result = await this.service.deleteEvent(id, hostId)
    await removeUploadedCover(result.coverImageUrl)
    return { success: true, message: 'Event deleted' }
  }

  // POST /events/:id/cover — загрузка обложки (multipart/form-data, поле cover)
  async uploadCover(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
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

    let data: Awaited<ReturnType<FastifyRequest['file']>>
    try {
      data = await request.file()
    } catch {
      return reply
        .code(400)
        .send({ error: true, message: 'Invalid multipart request', code: 'INVALID_REQUEST' })
    }
    if (!data) {
      return reply
        .code(400)
        .send({ error: true, message: 'File field "cover" is required', code: 'FILE_REQUIRED' })
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = extMap[data.mimetype]
    if (!ext) {
      return reply.code(400).send({
        error: true,
        message: 'Only JPEG, PNG and WebP images are allowed',
        code: 'INVALID_FILE_TYPE',
      })
    }

    let buffer: Buffer
    try {
      buffer = await data.toBuffer()
    } catch {
      return reply
        .code(413)
        .send({ error: true, message: 'File is too large (max 2MB)', code: 'FILE_TOO_LARGE' })
    }
    if (buffer.length > 2 * 1024 * 1024) {
      return reply
        .code(413)
        .send({ error: true, message: 'File is too large (max 2MB)', code: 'FILE_TOO_LARGE' })
    }

    // Проверяем владение до записи файла, чтобы не оставлять мусор на диске.
    const oldCoverUrl = await this.service.getCoverUrl(id, hostId)

    await mkdir(COVER_DIR, { recursive: true })
    const filename = `${randomUUID()}.${ext}`
    await writeFile(path.join(COVER_DIR, filename), buffer)

    const event = await this.service.setCover(id, hostId, `/uploads/events/${filename}`)
    await removeUploadedCover(oldCoverUrl)

    return { success: true, event }
  }

  // DELETE /events/:id/cover — убрать обложку
  async deleteCover(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
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

    const oldCoverUrl = await this.service.getCoverUrl(id, hostId)
    const event = await this.service.setCover(id, hostId, null)
    await removeUploadedCover(oldCoverUrl)

    return { success: true, event }
  }
}