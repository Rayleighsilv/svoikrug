import { FastifyRequest, FastifyReply } from 'fastify'
import { TagsService } from './service'

export class TagsHandler {
  constructor(private service: TagsService) {}

  // GET /tags — справочник тегов для форм и фильтров
  async list(_request: FastifyRequest, _reply: FastifyReply) {
    return { success: true, tags: await this.service.list() }
  }
}
