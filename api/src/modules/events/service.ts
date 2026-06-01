// api/src/modules/events/service.ts
import { PrismaClient } from '@prisma/client'
import { CreateEventInput, UpdateEventInput } from './schema'

export class EventService {
  constructor(private prisma: PrismaClient) {}

  async createEvent(hostId: string, data: CreateEventInput) {
    return this.prisma.event.create({
      data: {
        ...data,
        hostId,
        status: 'draft', // новое событие всегда черновик
      },
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
    
    return this.prisma.event.findMany({
      where: {
        AND: [
          status ? { status: status as any } : {},
          // district фильтруем через связанный Profile хоста
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
    if (!existing || existing.hostId !== hostId) {
      throw new Error('Event not found or access denied')
    }

    return this.prisma.event.update({
      where: { id },
      data,
      include: { host: { select: { email: true } } },
    })
  }

  async deleteEvent(id: string, hostId: string) {
    const existing = await this.prisma.event.findUnique({ where: { id }, select: { hostId: true } })
    if (!existing || existing.hostId !== hostId) {
      throw new Error('Event not found or access denied')
    }

    await this.prisma.event.delete({ where: { id } })
    return { success: true }
  }
}