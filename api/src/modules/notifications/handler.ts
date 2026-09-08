import { FastifyRequest, FastifyReply } from 'fastify'
import { NotificationService } from './service'
import { notificationParamsSchema } from './schema'

export class NotificationHandler {
  constructor(private service: NotificationService) {}

  // GET /notifications
  async list(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    const limitRaw = request.query.limit
    const limit = limitRaw ? Number(limitRaw) : 20
    if (limitRaw && (isNaN(limit) || limit <= 0)) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid limit parameter: must be a positive integer',
      })
    }
    const userId = request.userId!

    const notifications = await this.service.listForUser(userId, limit)
    return { success: true, notifications }
  }

  // POST /notifications/:id/read
  async markRead(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = notificationParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid notification ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const notification = await this.service.markRead(userId, id)
    return { success: true, notification }
  }

  // POST /notifications/read-all
  async markAllRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!
    const result = await this.service.markAllRead(userId)
    return result
  }

  // GET /notifications/unread-count
  async unreadCount(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!
    const { count } = await this.service.unreadCount(userId)
    return { success: true, count }
  }
}
