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
}
