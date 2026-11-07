import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'

const DAY_MS = 24 * 60 * 60 * 1000
export const CHAT_TTL_DAYS = 30

type EventSchedule = { startsAt: Date; endsAt?: Date | null }

// Чат живёт 30 дней после завершения события.
export function chatExpiry(event: EventSchedule): Date {
  const end = event.endsAt ?? event.startsAt
  return new Date(end.getTime() + CHAT_TTL_DAYS * DAY_MS)
}

// Отмена/удаление события: 30 дней с текущего момента.
export function chatExpiryFromNow(): Date {
  return new Date(Date.now() + CHAT_TTL_DAYS * DAY_MS)
}

type ChatEventSnapshot = {
  id: string
  hostId: string
  title: string
  coverImageUrl: string | null
  startsAt: Date
  endsAt: Date | null
}

const SENDER_SELECT = {
  id: true,
  profile: { select: { nickname: true, avatarUrl: true } },
} as const

function serializeMessage(message: {
  id: string
  text: string
  createdAt: Date
  senderId: string
  sender: { id: string; profile: { nickname: string; avatarUrl: string | null } | null }
}) {
  return {
    id: message.id,
    text: message.text,
    createdAt: message.createdAt,
    senderId: message.senderId,
    senderName: message.sender.profile?.nickname ?? 'Участник',
    senderAvatarUrl: message.sender.profile?.avatarUrl ?? null,
  }
}

export class ChatService {
  constructor(private prisma: PrismaClient) {}

  // Ленивая чистка: удаляем чаты, срок жизни которых истёк.
  async purgeExpired(): Promise<void> {
    await this.prisma.chat.deleteMany({ where: { expiresAt: { lte: new Date() } } })
  }

  // Гарантирует чат для события (для событий, созданных до появления чатов).
  async ensureForEvent(event: ChatEventSnapshot, memberIds: string[] = []) {
    const chat = await this.prisma.chat.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        title: event.title,
        coverImageUrl: event.coverImageUrl,
        startsAt: event.startsAt,
        expiresAt: chatExpiry(event),
        members: {
          create: Array.from(new Set([event.hostId, ...memberIds])).map((userId) => ({ userId })),
        },
      },
      update: {},
      select: { id: true },
    })

    await Promise.all(
      memberIds.map((userId) =>
        this.prisma.chatMember.upsert({
          where: { chatId_userId: { chatId: chat.id, userId } },
          create: { chatId: chat.id, userId },
          update: {},
        }),
      ),
    )

    return chat.id
  }

  // Гость отменил запись — убираем доступ к чату.
  async removeMember(eventId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { eventId },
      select: { id: true },
    })
    if (!chat) return
    await this.prisma.chatMember.deleteMany({ where: { chatId: chat.id, userId } })
  }

  // GET /chats — чаты пользователя с последним сообщением и счётчиком непрочитанных.
  async listForUser(userId: string) {
    await this.purgeExpired()

    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            event: { select: { hostId: true } },
            _count: { select: { members: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: SENDER_SELECT } },
            },
          },
        },
      },
    })

    const chats = await Promise.all(
      memberships.map(async (membership) => {
        const { chat } = membership
        const last = chat.messages[0]
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            createdAt: { gt: membership.lastReadAt },
          },
        })

        return {
          id: chat.id,
          eventId: chat.eventId,
          title: chat.title,
          coverImageUrl: chat.coverImageUrl,
          startsAt: chat.startsAt,
          expiresAt: chat.expiresAt,
          isHost: chat.event?.hostId === userId,
          memberCount: chat._count.members,
          unreadCount,
          lastMessage: last ? serializeMessage(last) : null,
          lastActivityAt: (last?.createdAt ?? chat.createdAt).getTime(),
        }
      }),
    )

    chats.sort((a, b) => b.lastActivityAt - a.lastActivityAt)

    return chats.map((chat) => ({
      id: chat.id,
      eventId: chat.eventId,
      title: chat.title,
      coverImageUrl: chat.coverImageUrl,
      startsAt: chat.startsAt,
      expiresAt: chat.expiresAt,
      isHost: chat.isHost,
      memberCount: chat.memberCount,
      unreadCount: chat.unreadCount,
      lastMessage: chat.lastMessage,
    }))
  }

  // GET /chats/unread-count — общее число непрочитанных сообщений.
  async unreadCount(userId: string) {
    await this.purgeExpired()

    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true, lastReadAt: true },
    })

    const counts = await Promise.all(
      memberships.map((membership) =>
        this.prisma.chatMessage.count({
          where: {
            chatId: membership.chatId,
            senderId: { not: userId },
            createdAt: { gt: membership.lastReadAt },
          },
        }),
      ),
    )

    return counts.reduce((sum, count) => sum + count, 0)
  }

  // GET /chats/:id — сообщения чата; открытие помечает их прочитанными.
  async getChat(userId: string, chatId: string) {
    await this.purgeExpired()

    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
      include: {
        chat: {
          include: {
            event: { select: { id: true, hostId: true, status: true } },
            _count: { select: { members: true } },
          },
        },
      },
    })
    if (!membership) {
      throw new AppError('Chat not found', 404, 'CHAT_NOT_FOUND')
    }

    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    })

    // Последние 200 сообщений; клиенту отдаём в хронологическом порядке.
    const messages = await this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { sender: { select: SENDER_SELECT } },
    })

    return {
      chat: {
        id: membership.chat.id,
        eventId: membership.chat.eventId,
        title: membership.chat.title,
        coverImageUrl: membership.chat.coverImageUrl,
        startsAt: membership.chat.startsAt,
        expiresAt: membership.chat.expiresAt,
        isHost: membership.chat.event?.hostId === userId,
        memberCount: membership.chat._count.members,
        event: membership.chat.event
          ? { id: membership.chat.event.id, status: membership.chat.event.status }
          : null,
      },
      messages: messages.reverse().map(serializeMessage),
    }
  }

  // POST /chats/:id/messages — отправить сообщение.
  async sendMessage(userId: string, chatId: string, text: string) {
    await this.purgeExpired()

    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { chatId: true },
    })
    if (!membership) {
      throw new AppError('Chat not found', 404, 'CHAT_NOT_FOUND')
    }

    const message = await this.prisma.chatMessage.create({
      data: { chatId, senderId: userId, text },
      include: { sender: { select: SENDER_SELECT } },
    })

    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: new Date() },
    })

    return serializeMessage(message)
  }
}
