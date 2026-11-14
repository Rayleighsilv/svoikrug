import {
  PrismaClient,
  EventFormat,
  EventStatus,
  GuestStatus,
  ParticipantGeo,
} from '@prisma/client'
import { CreateEventInput, UpdateEventInput } from './schema'
import { AppError } from '../../common/errors'
import { chatExpiry, chatExpiryFromNow } from '../chats/service'
import {
  HOST_TAG_RATINGS_SELECT,
  getReviewWindow,
  serializeHostTags,
} from '../ratings/tags'

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

// Хост в списках: имя, аватар, рейтинг, количество отзывов и публичные теги.
const HOST_PUBLIC_SELECT = {
  id: true,
  profile: { select: { nickname: true, avatarUrl: true, trustScore: true } },
  _count: { select: { ratingsReceived: true } },
  ratingsReceived: HOST_TAG_RATINGS_SELECT,
} as const

type EventWithTags = {
  tags: { tag: { slug: string; label: string; category: string; sortOrder: number } }[]
  host?: {
    ratingsReceived?: { tagSlug: string | null; raterId: string; createdAt: Date }[]
    [key: string]: unknown
  }
}

// event_tags → плоский массив тегов: клиенту не нужна структура join-таблицы.
// Сырые выдачи тегов хоста заменяем на публичную агрегацию.
function serializeEvent<T extends EventWithTags>(event: T) {
  const { tags, host, ...rest } = event
  return {
    ...rest,
    ...(host ? { host: serializeHostTags(host) } : {}),
    tags: tags.map((row) => row.tag),
  }
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
    const { tags, ...rawEventData } = data
    await this.assertTagsExist(tags)

    const format = rawEventData.format ?? 'offline'
    const { addressPublic, addressPrivate, participantGeo, meetingLink, ...rest } = rawEventData
    // Online: адреса не сохраняются из формы, география — из формы ('any' по умолчанию).
    // Offline/sport: география всегда 'city', ссылка на встречу не применяется.
    const eventData =
      format === 'online'
        ? {
            ...rest,
            format,
            addressPublic: null,
            addressPrivate: null,
            participantGeo: participantGeo ?? ('any' as ParticipantGeo),
            meetingLink: meetingLink ?? null,
          }
        : {
            ...rest,
            format,
            addressPublic,
            addressPrivate,
            participantGeo: 'city' as ParticipantGeo,
            meetingLink: null,
          }

    const startsAt = new Date(eventData.startsAt)
    const endsAt = eventData.endsAt ? new Date(eventData.endsAt) : null

    // Zod уже гарантирует валидность данных на входе.
    // Чат создаётся вместе с событием; хост сразу становится участником.
    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        hostId,
        status: 'draft' as EventStatus,
        chat: {
          create: {
            title: eventData.title,
            startsAt,
            expiresAt: chatExpiry({ startsAt, endsAt }),
            members: { create: { userId: hostId } },
          },
        },
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
            ratingsReceived: HOST_TAG_RATINGS_SELECT,
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

    // Встреча прошла — автоматически закрываем запись. Без этого событие
    // навсегда остаётся «Открыт для записи», а отзывы и теги недоступны.
    const meetingEnd = event.endsAt
      ? event.endsAt
      : new Date(event.startsAt.getTime() + (event.durationMinutes ?? 0) * 60_000)
    if (event.status === 'published' && meetingEnd.getTime() < Date.now()) {
      await this.prisma.event.update({ where: { id }, data: { status: 'closed' } })
      await this.prisma.chat.updateMany({
        where: { eventId: id },
        data: { expiresAt: chatExpiryFromNow() },
      })
      event.status = 'closed'
    }

    // Точный адрес доступен хосту и гостям, чью заявку он подтвердил.
    let canViewPrivateAddress = viewerId === event.hostId
    if (viewerId && !canViewPrivateAddress) {
      const guest = await this.prisma.eventGuest.findUnique({
        where: { eventId_userId: { eventId: id, userId: viewerId } },
        select: { status: true },
      })
      canViewPrivateAddress = guest?.status === 'approved' || guest?.status === 'attended'
    }

    const { addressPrivate, meetingLink, tags, host, ...publicEvent } = event
    const reviewWindow = getReviewWindow(event)
    return {
      ...publicEvent,
      host: serializeHostTags(host),
      tags: tags.map((row) => row.tag),
      // Точный адрес отдаётся только через GET /events/:id/address —
      // единая точка доступа с проверкой прав и аудит-логом.
      // Приватная ссылка на встречу доступна по тем же правилам, что и адрес.
      meetingLink: canViewPrivateAddress ? meetingLink : null,
      canViewPrivateAddress,
      hasPrivateAddress: Boolean(addressPrivate),
      hasMeetingLink: Boolean(meetingLink),
      // Окно отзывов считает сервер, клиент только отображает.
      reviewWindow: {
        opensAt: reviewWindow.opensAt,
        closesAt: reviewWindow.closesAt,
        isOpen: reviewWindow.isOpen,
      },
    }
  }

  // Точный адрес события. Отдельный эндпоинт: хост и подтверждённые гости.
  async getEventAddress(eventId: string, viewerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, addressPrivate: true },
    })
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }

    let allowed = event.hostId === viewerId
    if (!allowed) {
      const guest = await this.prisma.eventGuest.findUnique({
        where: { eventId_userId: { eventId, userId: viewerId } },
        select: { status: true },
      })
      allowed = guest?.status === 'approved' || guest?.status === 'attended'
    }
    if (!allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }
    if (!event.addressPrivate) {
      throw new AppError('Address not specified', 404, 'ADDRESS_NOT_FOUND')
    }

    return { addressPrivate: event.addressPrivate }
  }

  async listEvents(filters?: {
    status?: string
    district?: string
    theme?: string
    format?: EventFormat
    subcategory?: string
    tag?: string[]
    search?: string
    city?: string
    local?: boolean
    limit?: number
  }) {
    const {
      status,
      district,
      theme,
      format,
      subcategory,
      tag,
      search,
      city,
      local,
      limit = 20,
    } = filters || {}

    // Валидация статуса: только допустимые значения передаются в Prisma
    const safeStatus = status && (VALID_EVENT_STATUSES as readonly string[]).includes(status)
      ? (status as EventStatus)
      : undefined

    const trimmedSearch = search?.trim() || undefined

    // Если задан поиск без явного статуса — ищем только среди опубликованных.
    const effectiveStatus = safeStatus ?? (trimmedSearch ? ('published' as EventStatus) : undefined)

    // Чип «Только мой город» без города не может ничего показать.
    if (format === 'online' && local && !city) return []

    // География:
    // - online: 'any' виден всем, 'city' — только запрошенному городу;
    // - offline/sport: только выбранный город;
    // - главная без format: offline/sport города + online по правилу выше.
    let locationFilter = {}
    if (format === 'online') {
      if (local) {
        locationFilter = { participantGeo: 'city', city }
      } else if (city) {
        locationFilter = {
          OR: [
            { participantGeo: 'any' },
            { participantGeo: 'city', city },
          ],
        }
      }
    } else if (format) {
      locationFilter = city ? { city } : {}
    } else if (city) {
      locationFilter = {
        OR: [
          { format: { in: ['offline', 'sport'] as EventFormat[] }, city },
          {
            format: 'online' as EventFormat,
            OR: [
              { participantGeo: 'any' as ParticipantGeo },
              { participantGeo: 'city' as ParticipantGeo, city },
            ],
          },
        ],
      }
    }

    const events = await this.prisma.event.findMany({
      where: {
        AND: [
          effectiveStatus ? { status: effectiveStatus } : {},
          district ? { host: { profile: { district } } } : {},
          theme ? { theme } : {},
          format ? { format } : {},
          subcategory ? { subcategory } : {},
          tag?.length ? { tags: { some: { tagSlug: { in: tag } } } } : {},
          locationFilter,
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
      // Точный адрес и ссылка на встречу не должны попадать в публичные списки.
      omit: { addressPrivate: true, meetingLink: true },
      orderBy: { startsAt: 'asc' },
      take: limit,
    })

    return events.map((event) => serializeEvent(event))
  }

  async updateEvent(id: string, hostId: string, data: UpdateEventInput) {
    // Проверяем, что событие принадлежит пользователю
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { hostId: true, status: true, format: true },
    })
    if (!existing) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND')
    }
    if (existing.hostId !== hostId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    const { tags, ...eventData } = data
    await this.assertTagsExist(tags)

    // География и приватные поля зависят от итогового формата события.
    const effectiveFormat = eventData.format ?? existing.format
    if (effectiveFormat === 'online') {
      // Адреса из формы для online игнорируются (старые значения в БД не трогаем).
      delete eventData.addressPublic
      delete eventData.addressPrivate
      if (eventData.participantGeo === undefined && eventData.format === 'online') {
        eventData.participantGeo = 'any'
      }
    } else {
      eventData.participantGeo = 'city'
      delete eventData.meetingLink
    }

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

      const updated = await tx.event.update({
        where: { id },
        data: eventData as any,
        include: {
          host: { select: { email: true, profile: { select: { nickname: true } } } },
          ...TAGS_INCLUDE,
        },
      })

      // Синхронизируем снимок события в чате и срок его жизни.
      const wasFinished = existing.status === 'closed' || existing.status === 'archived'
      const isFinished = updated.status === 'closed' || updated.status === 'archived'
      const chatData: {
        title: string
        coverImageUrl: string | null
        startsAt: Date
        expiresAt?: Date
      } = {
        title: updated.title,
        coverImageUrl: updated.coverImageUrl,
        startsAt: updated.startsAt,
      }
      if (isFinished) {
        // Закрытие/архив раньше срока: 30 дней с момента закрытия.
        if (!wasFinished) chatData.expiresAt = chatExpiryFromNow()
      } else {
        chatData.expiresAt = chatExpiry(updated)
      }
      await tx.chat.updateMany({ where: { eventId: id }, data: chatData })

      return updated
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

    // Отмена события: чат остаётся доступным ещё 30 дней, затем удаляется.
    // При удалении события eventId в чате становится null (SetNull),
    // а снимок названия и даты сохраняется.
    await this.prisma.$transaction([
      this.prisma.chat.updateMany({
        where: { eventId: id },
        data: { expiresAt: chatExpiryFromNow() },
      }),
      this.prisma.event.delete({ where: { id } }),
    ])
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
