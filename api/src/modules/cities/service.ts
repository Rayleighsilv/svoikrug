import { PrismaClient } from '@prisma/client'
import { cityKey, normalizeCity } from '../../common/city'

// Базовые подсказки для пустого запроса и городов, которых ещё нет в событиях.
const BASE_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Воронеж',
  'Пермь',
  'Волгоград',
  'Краснодар',
  'Саратов',
  'Тюмень',
  'Тольятти',
  'Ижевск',
  'Барнаул',
  'Ульяновск',
  'Иркутск',
  'Хабаровск',
  'Ярославль',
  'Владивосток',
]

const byName = (a: string, b: string) => a.localeCompare(b, 'ru')

export class CitiesService {
  constructor(private prisma: PrismaClient) {}

  // GET /cities/suggest?q= — до 10 подсказок для непустого префикса,
  // для пустого — базовый список крупных городов.
  async suggest(query?: string): Promise<string[]> {
    const prefix = (query || '').trim().replace(/\s+/g, ' ')

    if (!prefix) {
      return [...BASE_CITIES].sort(byName)
    }

    const prefixKey = prefix.toLowerCase()

    // Distinct непустые города событий, подходящие по префиксу.
    const rows = await this.prisma.event.findMany({
      where: {
        city: { not: null, startsWith: prefix, mode: 'insensitive' },
      },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
      take: 10,
    })

    // База идёт первой, чтобы для известных городов сохранялось
    // привычное написание (например, «Санкт-Петербург»).
    const cities = new Map<string, string>()
    for (const city of BASE_CITIES) {
      if (cityKey(city).startsWith(prefixKey)) {
        cities.set(cityKey(city), city)
      }
    }

    for (const row of rows) {
      const city = row.city?.trim()
      if (!city) continue
      const key = cityKey(city)
      if (!cities.has(key)) {
        cities.set(key, normalizeCity(city))
      }
    }

    return [...cities.values()].sort(byName).slice(0, 10)
  }
}
