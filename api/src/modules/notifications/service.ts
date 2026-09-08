import { PrismaClient } from '@prisma/client'
import { AppError } from '../../common/errors'

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  // GET /notifications — список уведомлений текущего пользователя
  async listForUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  // POST /notifications/:id/read — отметить одно прочитанным
  async markRead(userId: string, notificationId: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    })
    if (!n) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND')
    }
    return this.prisma.notification.update({
      where: { id: n.id },
      data: { isRead: true },
    })
  }

  // POST /notifications/read-all — отметить все прочитанными
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  }

  // GET /notifications/unread-count — количество непрочитанных
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    })
    return { count }
  }
}
