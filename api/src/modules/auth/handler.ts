import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './service'
import { registerSchema, loginSchema, refreshSchema } from './schema'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 мин
const REFRESH_TOKEN_TTL_DAYS = 7
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60

export class AuthHandler {
  constructor(private service: AuthService) {}

  // ─── POST /auth/register ────────────────────────────────────
  async register(request: FastifyRequest, reply: FastifyReply) {
    const input = registerSchema.parse(request.body)

    const result = await this.service.register(input)

    reply.setCookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    })
    reply.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    })

    return reply.code(201).send({ success: true, user: result.user })
  }

  // ─── POST /auth/login ───────────────────────────────────────
  async login(request: FastifyRequest, reply: FastifyReply) {
    const input = loginSchema.parse(request.body)
    const deviceId = (request.headers['x-device-id'] as string) ?? undefined

    const result = await this.service.login(input, deviceId)

    reply.setCookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    })
    reply.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    })

    return reply.code(200).send({ success: true, user: result.user })
  }

  // ─── POST /auth/refresh ─────────────────────────────────────
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const oldRefreshToken = request.cookies?.refreshToken

    if (!oldRefreshToken) {
      return reply.code(401).send({
        error: true,
        message: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN',
      })
    }

    const result = await this.service.refresh(oldRefreshToken)

    reply.setCookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    })
    reply.setCookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    })

    return reply.code(200).send({ success: true, user: result.user })
  }

  // ─── POST /auth/logout ──────────────────────────────────────
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies?.refreshToken

    if (refreshToken) {
      try {
        await this.service.logout(refreshToken)
      } catch {
        // Ошибки игнорируем — всё равно очищаем cookies
      }
    }

    reply.clearCookie('accessToken', { path: '/' })
    reply.clearCookie('refreshToken', { path: '/' })

    return reply.code(200).send({ success: true, message: 'Logged out' })
  }

  // ─── GET /auth/me ───────────────────────────────────────────
  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId as string
    const user = await this.service.getCurrentUser(userId)
    return reply.code(200).send({ success: true, user })
  }
}