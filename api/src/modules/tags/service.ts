import { EventFormat, PrismaClient } from '@prisma/client'

export class TagsService {
  constructor(private prisma: PrismaClient) {}

  // Справочник тегов в порядке групп (sortOrder). С `format` — только вайбы,
  // разрешённые в этом формате; без него — весь каталог (обратная совместимость).
  async list(format?: EventFormat) {
    return this.prisma.tag.findMany({
      where: format ? { allowedFormats: { has: format } } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    })
  }
}
