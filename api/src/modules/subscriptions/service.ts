import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'

type PublicUser = {
  id: string
  nickname: string | null
  avatarUrl: string | null
  trustScore: number
}

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  // POST /users/:id/follow — подписаться на пользователя
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError('You cannot follow yourself', 400, 'CANNOT_FOLLOW_SELF')
    }
    const target = await this.prisma.user.findUnique({ where: { id: followingId } })
    if (!target) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }
    const existing = await this.prisma.subscription.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    if (existing) {
      throw new AppError('Already following this user', 409, 'ALREADY_FOLLOWING')
    }
    return this.prisma.subscription.create({ data: { followerId, followingId } })
  }

  // DELETE /users/:id/follow — отписаться от пользователя
  async unfollow(followerId: string, followingId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
    if (!existing) {
      throw new AppError('You are not following this user', 404, 'NOT_FOLLOWING')
    }
    await this.prisma.subscription.delete({ where: { id: existing.id } })
    return { success: true }
  }

  // GET /users/:id/followers — подписчики пользователя
  async followers(userId: string) {
    await this.ensureUser(userId)
    const rows = await this.prisma.subscription.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, profile: { select: { nickname: true, avatarUrl: true, trustScore: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toPublicUser(r.follower))
  }

  // GET /users/:id/following — на кого подписан пользователь
  async following(userId: string) {
    await this.ensureUser(userId)
    const rows = await this.prisma.subscription.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, profile: { select: { nickname: true, avatarUrl: true, trustScore: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toPublicUser(r.following))
  }

  // GET /users/:id/follow-status — подписан ли текущий пользователь на данного
  async followStatus(followerId: string, targetId: string) {
    await this.ensureUser(targetId)
    const existing = await this.prisma.subscription.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    })
    return { following: !!existing }
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }
  }

  private toPublicUser(u: {
    id: string
    profile?: {
      nickname?: string | null
      avatarUrl?: string | null
      trustScore: number
    } | null
  }): PublicUser {
    return {
      id: u.id,
      nickname: u.profile?.nickname ?? null,
      avatarUrl: u.profile?.avatarUrl ?? null,
      trustScore: u.profile?.trustScore ?? 0,
    }
  }
}
