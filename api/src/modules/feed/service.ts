import { PrismaClient } from '@prisma/client'

export class FeedService {
  constructor(private prisma: PrismaClient) {}

  // GET /feed/events — опубликованные события от тех, на кого подписан пользователь
  async getFeedForUser(followerId: string, limit = 20) {
    const subs = await this.prisma.subscription.findMany({
      where: { followerId },
      select: { followingId: true },
    })
    const hostIds = subs.map((s) => s.followingId)
    if (hostIds.length === 0) {
      return []
    }
    return this.prisma.event.findMany({
      where: {
        status: 'published',
        hostId: { in: hostIds },
      },
      include: {
        host: { select: { id: true, profile: { select: { nickname: true } } } },
        _count: { select: { guests: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
    })
  }
}
