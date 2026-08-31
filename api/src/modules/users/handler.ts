import { FastifyRequest, FastifyReply } from 'fastify'
import { UsersService } from './service'
import { userIdSchema } from './schema'

export class UsersHandler {
  constructor(private service: UsersService) {}

  // GET /users/:id — публичный профиль
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const user = await this.service.getById(id)
    return { success: true, user }
  }
}
