import { PrismaClient, EventStatus } from '@prisma/client'
import { CreateEventInput, UpdateEventInput } from './schema'
import { AppError } from '../../common/errors'

const VALID_EVENT_STATUSES: readonly EventStatus[] = ['draft', 'published', 'closed', 'archived'] as const

export class EventService {
  constructor(private prisma: PrismaClient) {}

  async createEvent(hostId: string, data: CreateEventInput) {
    // Zod уже гарантирует валидность данных на входе
    return this.prisma.event.create({
      data: {
        ...data,
        hostId,
        status: 'draft' as EventStatus,
      } as any,
      include: { host: { select: { email: true, profile: true } } },
    })
  }

  async getEventById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, email: true, profile: true } },
        _count: { select: { guests: true } },
      },
    })
  }

  async listEvents(filters?: { status?: string; district?: string; limit?: number }) {
    const { status, district, limit = 20 } = filters || {}

    // Валидация статуса: только допустимые значения передаются в Prisma
    const safeStatus = status && (VALID_EVENT_STATUSES as readonly string[]).includes(status)
      ? (status as EventStatus)
      : undefined

    return this.prisma.event.findMany({
      where: {
        AND: [
          safeStatus ? { status: safeStatus } : {},
          district ? { host: { profile: { district } } } : {},
        ],
      },
      include: {
        host: { select: { id: true, profile: { select: { nickname: true } } } },
        _count: { select: { guests: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
    })
  }

  async updateEvent(id: string, hostId: string, data: UpdateEventInput) {
    // Проверяем, что событие принадлежит пользователю
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { hostId: true } })
    if (!existing) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (existing.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    return this.prisma.event.update({
      where: { id },
      data: data as any,
      include: { host: { select: { email: true } } },
    })
  }

  async deleteEvent(id: string, hostId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { hostId: true } })
    if (!existing) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (existing.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    await this.prisma.event.delete({ where: { id } })
    return { success: true }
  }
}