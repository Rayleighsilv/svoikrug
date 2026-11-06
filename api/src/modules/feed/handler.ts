import { FastifyRequest, FastifyReply } from 'fastify'
import { EventFormat } from '@prisma/client'
import { FeedService } from './service'
import { normalizeCity } from '../../common/city'

const FORMATS = ['offline', 'sport', 'online']

export class FeedHandler {
  constructor(private service: FeedService) {}

  // GET /feed/events
  async getEvents(
    request: FastifyRequest<{
      Querystring: {
        limit?: string
        city?: string
        tag?: string
        format?: string
        subcategory?: string
      }
    }>,
    reply: FastifyReply,
  ) {
    const limitRaw = request.query.limit
    const limit = limitRaw ? Number(limitRaw) : 20
    if (limitRaw && (isNaN(limit) || limit <= 0)) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid limit parameter: must be a positive integer',
      })
    }
    const userId = request.userId!
    const city = request.query.city ? normalizeCity(request.query.city) : undefined
    const tag = request.query.tag?.trim() || undefined
    const formatRaw = request.query.format
    if (formatRaw && !FORMATS.includes(formatRaw)) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid format: must be offline, sport or online',
      })
    }
    const format = formatRaw as EventFormat | undefined
    const subcategory = request.query.subcategory?.trim() || undefined

    const events = await this.service.getFeedForUser(
      userId,
      limit,
      city || undefined,
      tag,
      format,
      subcategory,
    )
    return { success: true, events }
  }
}
