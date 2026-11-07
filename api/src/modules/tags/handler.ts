import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../common/errors'
import { TagsService } from './service'

const querySchema = z.object({
  format: z.enum(['offline', 'sport', 'online']).optional(),
})

export class TagsHandler {
  constructor(private service: TagsService) {}

  // GET /tags и /vibes — справочник вайбов для форм и фильтров.
  // ?format=offline|sport|online сужает список до вайбов формата.
  async list(request: FastifyRequest, _reply: FastifyReply) {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      throw new AppError('Invalid format', 400, 'INVALID_FORMAT')
    }
    return { success: true, tags: await this.service.list(parsed.data.format) }
  }
}
