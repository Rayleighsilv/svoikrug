import { PrismaClient, EventFormat, GuestStatus } from '@prisma/client'

export class FeedService {
  constructor(private prisma: PrismaClient) {}

  // GET /feed/events — опубликованные события от тех, на кого подписан пользователь
  async getFeedForUser(
    followerId: string,
    limit = 20,
    city?: string,
    tag?: string,
    format?: EventFormat,
    subcategory?: string,
  ) {
    const subs = await this.prisma.subscription.findMany({
      where: { followerId },
      select: { followingId: true },
    })
    const hostIds = subs.map((s) => s.followingId)
    if (hostIds.length === 0) {
      return []
    }
    const events = await this.prisma.event.findMany({
      where: {
        status: 'published',
        hostId: { in: hostIds },
        ...(city ? { city } : {}),
        ...(tag ? { tags: { some: { tagSlug: tag } } } : {}),
        ...(format ? { format } : {}),
        ...(subcategory ? { subcategory } : {}),
      },
      include: {
        host: {
          select: {
            id: true,
            profile: { select: { nickname: true, avatarUrl: true, trustScore: true } },
            _count: { select: { ratingsReceived: true } },
          },
        },
        tags: {
          select: {
            tag: { select: { slug: true, label: true, category: true, sortOrder: true } },
          },
          orderBy: { tag: { sortOrder: 'asc' } },
        },
        _count: {
          select: {
            guests: {
              where: {
                status: { in: ['pending', 'approved', 'attended'] as GuestStatus[] },
              },
            },
          },
        },
      },
      // Точный адрес не должен попадать в публичные списки.
      omit: { addressPrivate: true, meetingLink: true },
      orderBy: { startsAt: 'asc' },
      take: limit,
    })

    return events.map(({ tags, ...event }) => ({
      ...event,
      tags: tags.map((row) => row.tag),
    }))
  }
}
