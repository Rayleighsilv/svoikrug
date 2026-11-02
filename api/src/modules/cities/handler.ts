import { FastifyRequest, FastifyReply } from 'fastify'
import { CitiesService } from './service'
import { citySuggestQuerySchema } from './schema'

export class CitiesHandler {
  constructor(private service: CitiesService) {}

  // GET /cities/suggest?q= — публичные подсказки городов
  async suggest(
    request: FastifyRequest<{ Querystring: { q?: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = citySuggestQuerySchema.safeParse(request.query)
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

    const cities = await this.service.suggest(parsed.data.q)
    return { cities }
  }
}
