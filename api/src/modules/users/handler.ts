import { FastifyRequest, FastifyReply } from 'fastify'
import { UsersService } from './service'
import { userIdSchema, updateProfileSchema } from './schema'

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

  // PATCH /users/me/profile — обновление своего профиля
  async updateProfile(
    request: FastifyRequest<{ Body: { nickname?: string; bio?: string; district?: string; avatarUrl?: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues,
      })
    }
    const userId = request.userId!

    const profile = await this.service.updateMyProfile(userId, parsed.data)
    return { success: true, profile }
  }
}
