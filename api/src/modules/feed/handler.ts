import { FastifyRequest, FastifyReply } from 'fastify'
import { FeedService } from './service'

export class FeedHandler {
  constructor(private service: FeedService) {}

  // GET /feed/events
  async getEvents(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    const limitRaw = request.query.limit
    const limit = limitRaw ? Number(limitRaw) : 20
    if (limitRaw && (isNaN(limit) || limit <= 0)) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid limit parameter: must be a positive integer',
      })
    }
    const userId = request.userId!

    const events = await this.service.getFeedForUser(userId, limit)
    return { success: true, events }
  }
}
