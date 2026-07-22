import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'crypto'
import { RegisterInput, LoginInput } from './schema'

const SALT_ROUNDS = 12
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 минут
const REFRESH_TOKEN_TTL_DAYS = 7

// Интерфейс для JWT, который будет передан из Fastify-плагина в server.ts
export interface JwtInstance {
  sign: (payload: { sub: string }, opts?: { expiresIn?: string | number }) => string
  verify: <T = unknown>(token: string) => T
}

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwt: JwtInstance,
  ) {}

  // ─── Регистрация ──────────────────────────────────────────
  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    })
    if (existing) {
      throw new Error('User with this email already exists')
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            nickname: input.nickname ?? `user_${Date.now()}`,
          },
        },
      },
      include: { profile: true },
    })

    const tokens = await this.generateTokenPair(user.id)
    return { user: this.sanitizeUser(user), ...tokens }
  }

  // ─── Логин ────────────────────────────────────────────────
  async login(input: LoginInput, deviceId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true },
    })
    if (!user) {
      throw new Error('Invalid credentials')
    }
    if (user.status === 'suspended') {
      throw new Error('Account is suspended')
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash)
    if (!passwordValid) {
      throw new Error('Invalid credentials')
    }

    const tokens = await this.generateTokenPair(user.id, deviceId)
    return { user: this.sanitizeUser(user), ...tokens }
  }

  // ─── Refresh: ротация токенов ─────────────────────────────
  async refresh(oldRefreshToken: string) {
    const tokenHash = this.hashToken(oldRefreshToken)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { profile: true } } },
    })

    if (!stored) {
      throw new Error('Invalid refresh token')
    }
    if (stored.revokedAt) {
      // Токен уже использован — возможный признак компрометации
      throw new Error('Refresh token already revoked')
    }
    if (stored.expiresAt < new Date()) {
      throw new Error('Refresh token expired')
    }

    // Инвалидируем старый токен
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    // Выдаём новую пару
    const tokens = await this.generateTokenPair(stored.userId, stored.deviceId ?? undefined)
    return {
      user: this.sanitizeUser(stored.user),
      ...tokens,
    }
  }

  // ─── Logout: инвалидация refresh-токена ───────────────────
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  // ─── Получить текущего пользователя по userId из JWT ──────
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user) {
      throw new Error('User not found')
    }
    return this.sanitizeUser(user)
  }

  // ─── Приватные хелперы ────────────────────────────────────
  private async generateTokenPair(userId: string, deviceId?: string) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    )

    const rawRefreshToken = randomBytes(64).toString('base64url')
    const tokenHash = this.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        deviceId: deviceId ?? null,
        expiresAt,
      },
    })

    return { accessToken, refreshToken: rawRefreshToken }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      profile: user.profile
        ? {
            nickname: user.profile.nickname,
            bio: user.profile.bio,
            avatarUrl: user.profile.avatarUrl,
            district: user.profile.district,
            trustScore: user.profile.trustScore,
            isVerified: user.profile.isVerified,
          }
        : null,
    }
  }
}