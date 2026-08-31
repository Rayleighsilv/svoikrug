import { PrismaClient, GuestStatus } from '@prisma/client'
import { AppError } from '../../common/errors'

export class RsvpService {
  constructor(private prisma: PrismaClient) {}

  // POST /events/:id/rsvp — записаться в гости
  async join(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (event.status !== 'published') {
      throw new AppError('Event is not published', 400, 'EVENT_NOT_PUBLISHED')
    }
    if (event.hostId === userId) {
      throw new AppError('You cannot join your own event', 400, 'CANNOT_JOIN_OWN_EVENT')
    }

    // Уже записан?
    const existing = await this.prisma.eventGuest.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (existing) {
      throw new AppError('You have already joined this event', 409, 'ALREADY_JOINED')
    }

    // Лимит гостей (если задан)
    if (event.maxGuests != null) {
      const count = await this.prisma.eventGuest.count({ where: { eventId } })
      if (count >= event.maxGuests) {
        throw new AppError('The event is full', 400, 'EVENT_FULL')
      }
    }

    // Для MVP без модерации — сразу approved.
    return this.prisma.eventGuest.create({
      data: { eventId, userId, status: 'approved' as GuestStatus },
      include: { user: { include: { profile: true } } },
    })
  }

  // DELETE /events/:id/rsvp — отменить свою запись
  async cancel(userId: string, eventId: string) {
    const existing = await this.prisma.eventGuest.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (!existing) {
      throw new AppError('You are not a guest of this event', 404, 'NOT_A_GUEST')
    }
    await this.prisma.eventGuest.delete({ where: { id: existing.id } })
    return { success: true }
  }

  // GET /events/:id/guests — список гостей события
  async listGuests(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    return this.prisma.eventGuest.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, profile: { select: { nickname: true, avatarUrl: true } } } },
      },
      orderBy: { joinedAt: 'asc' },
    })
  }
}
