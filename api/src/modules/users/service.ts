import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'

export class UsersService {
  constructor(private prisma: PrismaClient) {}

  // GET /users/:id — публичный профиль пользователя
  async getById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            nickname: true,
            bio: true,
            avatarUrl: true,
            district: true,
            trustScore: true,
            isVerified: true,
          },
        },
      },
    })
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }
    const p = user.profile
    return {
      id: user.id,
      nickname: p?.nickname ?? null,
      bio: p?.bio ?? null,
      avatarUrl: p?.avatarUrl ?? null,
      district: p?.district ?? null,
      trustScore: p?.trustScore ?? 0,
      isVerified: p?.isVerified ?? false,
    }
  }

  // PATCH /users/me/profile — обновление своего профиля
  async updateMyProfile(
    userId: string,
    input: { nickname?: string; bio?: string; district?: string; avatarUrl?: string },
  ) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } })
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    // Проверка уникальности ника
    if (input.nickname !== undefined) {
      const existing = await this.prisma.profile.findUnique({ where: { nickname: input.nickname } })
      if (existing && existing.userId !== userId) {
        throw new AppError('Nickname is already taken', 409, 'NICKNAME_TAKEN')
      }
    }

    const data: { nickname?: string; bio?: string; district?: string; avatarUrl?: string } = {}
    if (input.nickname !== undefined) data.nickname = input.nickname
    if (input.bio !== undefined) data.bio = input.bio
    if (input.district !== undefined) data.district = input.district
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl

    const updated = await this.prisma.profile.update({ where: { userId }, data })
    return {
      id: userId,
      nickname: updated.nickname,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      district: updated.district,
      trustScore: updated.trustScore,
      isVerified: updated.isVerified,
    }
  }
}
