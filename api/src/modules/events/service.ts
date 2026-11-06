import { PrismaClient, EventFormat, EventStatus, GuestStatus } from '@prisma/client'
import { CreateEventInput, UpdateEventInput } from './schema'
import { AppError } from '../../common/errors'

const VALID_EVENT_STATUSES: readonly EventStatus[] = ['draft', 'published', 'closed', 'archived'] as const

// Публичное представление тега в ответах API.
const TAG_SELECT = {
  slug: true,
  label: true,
  category: true,
  sortOrder: true,
} as const

const TAGS_INCLUDE = {
  tags: {
    select: { tag: { select: TAG_SELECT } },
    orderBy: { tag: { sortOrder: 'asc' } },
  },
} as const

// Хост в списках: имя, аватар, рейтинг и количество отзывов.
const HOST_PUBLIC_SELECT = {
  id: true,
  profile: { select: { nickname: true, avatarUrl: true, trustScore: true } },
  _count: { select: { ratingsReceived: true } },
} as const

type EventWithTags = { tags: { tag: { slug: string; label: string; category: string; sortOrder: number } }[] }

// event_tags → плоский массив тегов: клиенту не нужна структура join-таблицы.
function serializeEvent<T extends EventWithTags>(event: T) {
  const { tags, ...rest } = event
  return { ...rest, tags: tags.map((row) => row.tag) }
}

export class EventService {
  constructor(private prisma: PrismaClient) {}

  // Теги приходят слагами; неизвестный слаг — ошибка валидации, а не 500 от FK.
  private async assertTagsExist(tags?: string[]) {
    if (!tags?.length) return
    const unique = Array.from(new Set(tags))
    const found = await this.prisma.tag.count({ where: { slug: { in: unique } } })
    if (found !== unique.length) {
      throw new AppError('Unknown tag', 400, 'UNKNOWN_TAG')
    }
  }

  async createEvent(hostId: string, data: CreateEventInput) {
    const { tags, ...eventData } = data
    await this.assertTagsExist(tags)

    // Zod уже гарантирует валидность данных на входе
    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        hostId,
        status: 'draft' as EventStatus,
        ...(tags?.length ? { tags: { create: tags.map((tagSlug) => ({ tagSlug })) } } : {}),
      } as any,
      include: {
        host: { select: { email: true, profile: true } },
        ...TAGS_INCLUDE,
      },
    })
    return serializeEvent(event)
  }

  async getEventById(id: string, viewerId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: true,
            _count: { select: { ratingsReceived: true } },
          },
        },
        ...TAGS_INCLUDE,
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
    })
    if (!event) return null

    // Точный адрес доступен хосту и гостям, чью заявку он подтвердил.
    let canViewPrivateAddress = viewerId === event.hostId
    if (viewerId && !canViewPrivateAddress) {
      const guest = await this.prisma.eventGuest.findUnique({
        where: { eventId_userId: { eventId: id, userId: viewerId } },
        select: { status: true },
      })
      canViewPrivateAddress = guest?.status === 'approved' || guest?.status === 'attended'
    }

    const { addressPrivate, tags, ...publicEvent } = event
    return {
      ...publicEvent,
      tags: tags.map((row) => row.tag),
      addressPrivate: canViewPrivateAddress ? addressPrivate : null,
      canViewPrivateAddress,
      hasPrivateAddress: Boolean(addressPrivate),
    }
  }

  async listEvents(filters?: {
    status?: string
    district?: string
    theme?: string
    format?: EventFormat
    subcategory?: string
    tag?: string
    search?: string
    city?: string
    limit?: number
  }) {
    const { status, district, theme, format, subcategory, tag, search, city, limit = 20 } =
      filters || {}

    // Валидация статуса: только допустимые значения передаются в Prisma
    const safeStatus = status && (VALID_EVENT_STATUSES as readonly string[]).includes(status)
      ? (status as EventStatus)
      : undefined

    const trimmedSearch = search?.trim() || undefined

    // Если задан поиск без явного статуса — ищем только среди опубликованных.
    const effectiveStatus = safeStatus ?? (trimmedSearch ? ('published' as EventStatus) : undefined)

    const events = await this.prisma.event.findMany({
      where: {
        AND: [
          effectiveStatus ? { status: effectiveStatus } : {},
          district ? { host: { profile: { district } } } : {},
          theme ? { theme } : {},
          format ? { format } : {},
          subcategory ? { subcategory } : {},
          tag ? { tags: { some: { tagSlug: tag } } } : {},
          city ? { city } : {},
          trimmedSearch
            ? {
                OR: [
                  { title: { contains: trimmedSearch, mode: 'insensitive' } },
                  { description: { contains: trimmedSearch, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      include: {
        host: { select: HOST_PUBLIC_SELECT },
        ...TAGS_INCLUDE,
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
      omit: { addressPrivate: true },
      orderBy: { startsAt: 'asc' },
      take: limit,
    })

    return events.map((event) => serializeEvent(event))
  }

  async updateEvent(id: string, hostId: string, data: UpdateEventInput) {
    // Проверяем, что событие принадлежит пользователю
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { hostId: true, status: true },
    })
    if (!existing) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (existing.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const { tags, ...eventData } = data
    await this.assertTagsExist(tags)

    // Теги заменяются целиком: undefined — не трогаем, [] — очищаем.
    const event = await this.prisma.$transaction(async (tx) => {
      if (tags !== undefined) {
        await tx.eventTag.deleteMany({ where: { eventId: id } })
        if (tags.length > 0) {
          await tx.eventTag.createMany({
            data: tags.map((tagSlug) => ({ eventId: id, tagSlug })),
          })
        }
      }

      return tx.event.update({
        where: { id },
        data: eventData as any,
        include: {
          host: { select: { email: true, profile: { select: { nickname: true } } } },
          ...TAGS_INCLUDE,
        },
      })
    })

    // Уведомляем подписчиков хоста при переходе draft → published (без дублей).
    if (existing.status === 'draft' && data.status === 'published' && event.status === 'published') {
      const subs = await this.prisma.subscription.findMany({
        where: { followingId: hostId },
        select: { followerId: true },
      })
      const hostName = event.host.profile?.nickname ?? 'Хост'
      if (subs.length > 0) {
        await this.prisma.notification.createMany({
          data: subs.map((s) => ({
            userId: s.followerId,
            type: 'NEW_EVENT_FROM_SUBSCRIPTION',
            payload: { eventId: event.id, title: event.title, hostName },
          })),
        })
      }
    }

    return serializeEvent(event)
  }

  async deleteEvent(id: string, hostId: string) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { hostId: true, coverImageUrl: true },
    })
    if (!existing) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (existing.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    await this.prisma.event.delete({ where: { id } })
    // coverImageUrl нужен обработчику, чтобы удалить файл обложки с диска.
    return { success: true, coverImageUrl: existing.coverImageUrl }
  }

  // ─── Обложка события ────────────────────────────────────────

  async getCoverUrl(id: string, hostId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { hostId: true, coverImageUrl: true },
    })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (event.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }
    return event.coverImageUrl
  }

  async setCover(id: string, hostId: string, coverImageUrl: string | null) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { hostId: true },
    })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (event.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    return this.prisma.event.update({
      where: { id },
      data: { coverImageUrl },
      select: { id: true, coverImageUrl: true },
    })
  }
}
