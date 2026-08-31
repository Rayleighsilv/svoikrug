import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'

export class RatingService {
  constructor(private prisma: PrismaClient) {}

  // POST /events/:id/ratings — оставить оценку другому участнику
  async createRating(input: {
    raterId: string
    eventId: string
    ratedUserId: string
    score: number
    comment?: string
  }) {
    const { raterId, eventId, ratedUserId, score, comment } = input

    // 1) Событие существует и закрыто/в архиве
    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (event.status !== 'closed' && event.status !== 'archived') {
      throw new AppError('Event is not closed yet', 400, 'EVENT_NOT_CLOSED')
    }

    // 2) Нельзя оценить себя
    if (raterId === ratedUserId) {
      throw new AppError('You cannot rate yourself', 400, 'CANNOT_RATE_SELF')
    }

    // 3) Оба должны быть гостями со статусом attended
    const raterGuest = await this.prisma.eventGuest.findFirst({
      where: { eventId, userId: raterId, status: 'attended' },
    })
    if (!raterGuest) {
      throw new AppError('You did not attend this event', 403, 'NOT_A_GUEST')
    }
    const ratedGuest = await this.prisma.eventGuest.findFirst({
      where: { eventId, userId: ratedUserId, status: 'attended' },
    })
    if (!ratedGuest) {
      throw new AppError('The rated user did not attend this event', 403, 'NOT_A_GUEST')
    }

    // 4) Нельзя оценить одного и того же пользователя дважды за это событие
    const existing = await this.prisma.rating.findFirst({
      where: { eventId, raterId, ratedId: ratedUserId },
    })
    if (existing) {
      throw new AppError('You have already rated this user', 409, 'ALREADY_RATED')
    }

    const rating = await this.prisma.rating.create({
      data: { eventId, raterId, ratedId: ratedUserId, score, comment: comment || undefined },
    })

    // Обновляем trustScore оцениваемого как среднее всех полученных оценок.
    await this.recalcTrustScore(ratedUserId)

    return rating
  }

  // GET /users/:id/ratings — список оценок пользователя
  async listRatings(userId: string) {
    const rows = await this.prisma.rating.findMany({
      where: { ratedId: userId },
      include: {
        event: { select: { title: true } },
        rater: { select: { profile: { select: { nickname: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt,
      event: { title: r.event.title },
      rater: { nickname: r.rater.profile?.nickname ?? null },
    }))
  }

  // GET /users/:id/rating-summary — сводка
  async summary(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { ratedId: userId },
      select: { score: true },
    })
    if (ratings.length === 0) {
      return { averageScore: 0, totalCount: 0 }
    }
    const sum = ratings.reduce((acc, r) => acc + r.score, 0)
    const averageScore = Math.round((sum / ratings.length) * 10) / 10
    return { averageScore, totalCount: ratings.length }
  }

  private async recalcTrustScore(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { ratedId: userId },
      select: { score: true },
    })
    const count = ratings.length
    const avg = count ? ratings.reduce((acc, r) => acc + r.score, 0) / count : 0
    await this.prisma.profile.updateMany({ where: { userId }, data: { trustScore: avg } })
  }
}
