import { FastifyRequest, FastifyReply } from 'fastify'
import { SubscriptionService } from './service'
import { userIdSchema } from './schema'

export class SubscriptionHandler {
  constructor(private service: SubscriptionService) {}

  // POST /users/:id/follow
  async follow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const subscription = await this.service.follow(userId, id)
    return reply.code(201).send({ success: true, subscription })
  }

  // DELETE /users/:id/follow
  async unfollow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const result = await this.service.unfollow(userId, id)
    return result
  }

  // GET /users/:id/followers
  async followers(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const users = await this.service.followers(id)
    return { success: true, users }
  }

  // GET /users/:id/following
  async following(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const users = await this.service.following(id)
    return { success: true, users }
  }

  // GET /users/:id/follow-status
  async followStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data
    const userId = request.userId!

    const status = await this.service.followStatus(userId, id)
    return { success: true, ...status }
  }
}
