import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { UsersService } from './service'
import { userIdSchema, updateProfileSchema } from './schema'

export class UsersHandler {
  constructor(private service: UsersService) {}

  // GET /users/:id — публичный профиль
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsed = userIdSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Invalid user ID format',
        details: parsed.error.issues,
      })
    }
    const { id } = parsed.data

    const user = await this.service.getById(id)
    return { success: true, user }
  }

  // PATCH /users/me/profile — обновление своего профиля
  async updateProfile(
    request: FastifyRequest<{ Body: { nickname?: string; bio?: string; district?: string; avatarUrl?: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues,
      })
    }
    const userId = request.userId!

    const profile = await this.service.updateMyProfile(userId, parsed.data)
    return { success: true, profile }
  }

  // POST /users/me/avatar — загрузка аватара (multipart/form-data, поле avatar)
  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!

    let data: Awaited<ReturnType<FastifyRequest['file']>>
    try {
      data = await request.file()
    } catch {
      return reply.code(400).send({ error: true, message: 'Invalid multipart request', code: 'INVALID_REQUEST' })
    }
    if (!data) {
      return reply
        .code(400)
        .send({ error: true, message: 'File field "avatar" is required', code: 'FILE_REQUIRED' })
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = extMap[data.mimetype]
    if (!ext) {
      return reply.code(400).send({
        error: true,
        message: 'Only JPEG, PNG and WebP images are allowed',
        code: 'INVALID_FILE_TYPE',
      })
    }

    let buffer: Buffer
    try {
      buffer = await data.toBuffer()
    } catch {
      return reply
        .code(413)
        .send({ error: true, message: 'File is too large (max 2MB)', code: 'FILE_TOO_LARGE' })
    }
    if (buffer.length > 2 * 1024 * 1024) {
      return reply
        .code(413)
        .send({ error: true, message: 'File is too large (max 2MB)', code: 'FILE_TOO_LARGE' })
    }

    const dir = path.resolve(process.cwd(), 'uploads', 'avatars')
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.${ext}`
    await writeFile(path.join(dir, filename), buffer)

    const oldAvatarUrl = await this.service.getAvatarUrl(userId)
    const profile = await this.service.setAvatar(userId, `/uploads/avatars/${filename}`)

    // Удаляем старый файл аватара, если он лежит в нашей папке uploads
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const oldName = path.basename(oldAvatarUrl)
      try {
        await unlink(path.join(dir, oldName))
      } catch {
        // файл мог отсутствовать — игнорируем
      }
    }

    return { success: true, profile }
  }
}
