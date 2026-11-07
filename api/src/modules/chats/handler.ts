import { FastifyRequest, FastifyReply } from 'fastify'
import { ChatService } from './service'
import { chatIdSchema, sendMessageSchema } from './schema'

export class ChatHandler {
  constructor(private service: ChatService) {}

  // GET /chats
  async list(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.userId!
    const chats = await this.service.listForUser(userId)
    return { success: true, chats }
  }

  // GET /chats/unread-count
  async unreadCount(request: FastifyRequest, _reply: FastifyReply) {
    const userId = request.userId!
    const count = await this.service.unreadCount(userId)
    return { success: true, count }
  }

  // GET /chats/:id
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = chatIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid chat ID format',
        details: parsed.error.issues,
      })
    }

    const userId = request.userId!
    const result = await this.service.getChat(userId, parsed.data.id)
    return { success: true, ...result }
  }

  // POST /chats/:id/messages
  async sendMessage(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const parsedParams = chatIdSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid chat ID format',
        details: parsedParams.error.issues,
      })
    }

    const parsedBody = sendMessageSchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return reply.code(400).send({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const userId = request.userId!
    const message = await this.service.sendMessage(
      userId,
      parsedParams.data.id,
      parsedBody.data.text,
    )
    return reply.code(201).send({ success: true, message })
  }
}
