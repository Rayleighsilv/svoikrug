import { FastifyRequest, FastifyReply } from 'fastify'
import { RatingService } from './service'
import { eventIdParamSchema, userIdParamSchema, createRatingSchema } from './schema'

export class RatingHandler {
  constructor(private service: RatingService) {}

  // POST /events/:id/ratings
  async create(
    request: FastifyRequest<{ Params: { id: string }; Body: { ratedUserId: string; score: number; comment?: string } }>,
    reply: FastifyReply,
  ) {
    const parsedParams = eventIdParamSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid event ID format',
        details: parsedParams.error.issues,
      })
    }
    const parsedBody = createRatingSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsedBody.error.issues,
      })
    }
    const { id: eventId } = parsedParams.data
    const { ratedUserId, score, comment } = parsedBody.data
    const raterId = request.userId!

    const rating = await this.service.createRating({ raterId, eventId, ratedUserId, score, comment })
    return reply.code(201).send({ success: true, rating })
  }

  // GET /users/:id/ratings
  async list(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdParamSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const ratings = await this.service.listRatings(id)
    return { success: true, ratings }
  }

  // GET /users/:id/rating-summary
  async summary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdParamSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const summary = await this.service.summary(id)
    return { success: true, ...summary }
  }
}
