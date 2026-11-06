import { PrismaClient } from '@prisma/client'

export class TagsService {
  constructor(private prisma: PrismaClient) {}

  // Справочник тегов в порядке категорий (тип в БД) и sortOrder.
  async list() {
    return this.prisma.tag.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
  }
}
