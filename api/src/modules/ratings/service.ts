import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'
import {
  RED_TAG_CONSENSUS,
  USER_TAG_TTL_MS,
  aggregatePersonalSignals,
  aggregatePublicTags,
  getReviewWindow,
  getUserTag,
} from './tags'

export class RatingService {
  constructor(private prisma: PrismaClient) {}

  // POST /events/:id/ratings — анонимная оценка участника или хоста.
  async createRating(input: {
    raterId: string
    eventId: string
    ratedUserId: string
    score: number
    tagSlug: string
    comment?: string
  }) {
    const { raterId, eventId, ratedUserId, score, tagSlug, comment } = input

    // 1) Событие существует и закрыто/в архиве
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        hostId: true,
        startsAt: true,
        endsAt: true,
        durationMinutes: true,
      },
    })
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

    // 3) Окно выдачи: открывается через 10 часов после встречи, закрывается через 72.
    const reviewWindow = getReviewWindow(event)
    const now = new Date()
    if (now < reviewWindow.opensAt) {
      throw new AppError('Reviews are not open yet', 400, 'REVIEW_WINDOW_NOT_OPEN')
    }
    if (now > reviewWindow.closesAt) {
      throw new AppError('Reviews are closed', 400, 'REVIEW_WINDOW_CLOSED')
    }

    // 4) Оценивать может только гость, отмеченный как посетивший встречу.
    const raterGuest = await this.prisma.eventGuest.findFirst({
      where: { eventId, userId: raterId, status: 'attended' },
    })
    if (!raterGuest) {
      throw new AppError('You did not attend this event', 403, 'NOT_A_GUEST')
    }

    // 5) Оцениваемый — посетивший гость или хост события.
    const isHost = ratedUserId === event.hostId
    if (!isHost) {
      const ratedGuest = await this.prisma.eventGuest.findFirst({
        where: { eventId, userId: ratedUserId, status: 'attended' },
      })
      if (!ratedGuest) {
        throw new AppError('The rated user did not attend this event', 403, 'NOT_A_GUEST')
      }
    }

    // 6) Тег обязателен и должен подходить аудитории (гость/хост).
    const tag = getUserTag(tagSlug)
    if (!tag) {
      throw new AppError('Unknown tag', 400, 'UNKNOWN_TAG')
    }
    if (tag.audience !== (isHost ? 'host' : 'guest')) {
      throw new AppError('Tag is not allowed for this participant', 400, 'TAG_NOT_ALLOWED')
    }

    // 7) Нельзя оценить одного и того же пользователя дважды за это событие
    const existing = await this.prisma.rating.findFirst({
      where: { eventId, raterId, ratedId: ratedUserId },
    })
    if (existing) {
      throw new AppError('You have already rated this user', 409, 'ALREADY_RATED')
    }

    const rating = await this.prisma.rating.create({
      data: {
        eventId,
        raterId,
        ratedId: ratedUserId,
        score,
        tagSlug: tag.slug,
        comment: comment || undefined,
      },
    })

    // Обновляем trustScore оцениваемого как среднее всех полученных оценок.
    await this.recalcTrustScore(ratedUserId)

    // Красный тег: личный сигнал получателю + запись в очередь модерации.
    // Публичным он станет только при консенсусе (2+ независимых автора).
    if (tag.color === 'red') {
      const authors = await this.prisma.rating.findMany({
        where: {
          ratedId: ratedUserId,
          tagSlug: tag.slug,
          createdAt: { gte: new Date(Date.now() - USER_TAG_TTL_MS) },
        },
        select: { raterId: true },
        distinct: ['raterId'],
      })
      const consensus = authors.length >= RED_TAG_CONSENSUS

      await this.prisma.moderationSignal.create({
        data: { ratingId: rating.id, ratedId: ratedUserId, raterId, tagSlug: tag.slug },
      })
      if (consensus) {
        await this.prisma.moderationSignal.updateMany({
          where: { ratedId: ratedUserId, tagSlug: tag.slug, status: 'pending' },
          data: { status: 'consensus' },
        })
      }

      await this.prisma.notification.create({
        data: {
          userId: ratedUserId,
          type: 'SECURITY_RED_TAG_SIGNAL',
          payload: {
            eventId,
            message: consensus
              ? `Тег «${tag.label}» подтверждён двумя участниками и теперь виден в вашем профиле.`
              : `Получен личный сигнал: «${tag.label}». Пока он не виден публично и учитывается модерацией.`,
          },
        },
      })
    }

    return rating
  }

  // GET /users/:id/ratings — анонимный список оценок пользователя.
  async listRatings(userId: string) {
    const rows = await this.prisma.rating.findMany({
      where: { ratedId: userId },
      include: { event: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const freshAfter = Date.now() - USER_TAG_TTL_MS
    const publicTagSlugs = new Set(
      aggregatePublicTags(
        rows.map((row) => ({
          tagSlug: row.tagSlug,
          raterId: row.raterId,
          createdAt: row.createdAt,
        })),
      ).map((tag) => tag.slug),
    )

    return rows.map((row) => {
      const tag = row.tagSlug ? getUserTag(row.tagSlug) : undefined
      const isFresh = row.createdAt.getTime() >= freshAfter
      // Одиночный красный тег не должен утекать в публичный список отзывов.
      const visibleTag =
        tag && isFresh && (tag.color !== 'red' || publicTagSlugs.has(tag.slug))
          ? { slug: tag.slug, label: tag.label, color: tag.color }
          : null

      return {
        id: row.id,
        score: row.score,
        comment: row.comment,
        createdAt: row.createdAt,
        event: { title: row.event.title },
        tag: visibleTag,
      }
    })
  }

  // GET /users/:id/tags — публичные теги за последние 12 месяцев.
  async publicTags(userId: string) {
    const rows = await this.prisma.rating.findMany({
      where: {
        ratedId: userId,
        tagSlug: { not: null },
        createdAt: { gte: new Date(Date.now() - USER_TAG_TTL_MS) },
      },
      select: { tagSlug: true, raterId: true, createdAt: true },
    })
    return aggregatePublicTags(rows)
  }

  // GET /users/me/signals — одиночные красные теги, видимые только получателю.
  async personalSignals(userId: string) {
    const rows = await this.prisma.rating.findMany({
      where: {
        ratedId: userId,
        tagSlug: { not: null },
        createdAt: { gte: new Date(Date.now() - USER_TAG_TTL_MS) },
      },
      select: { tagSlug: true, raterId: true, createdAt: true },
    })
    return aggregatePersonalSignals(rows)
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
