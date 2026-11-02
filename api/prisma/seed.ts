import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { EventStatus, GuestStatus, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { normalizeCity } from '../src/common/city'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })

const PASSWORD = 'Password123'

const PEOPLE = [
  { first: 'Алексей', last: 'Петров', city: 'Москва', district: 'Хамовники', bio: 'Люблю квартирники, кино и разговоры до утра.' },
  { first: 'Мария', last: 'Смирнова', city: 'Санкт-Петербург', district: 'Центральный', bio: 'Организую книжный клуб и уютные встречи.' },
  { first: 'Сергей', last: 'Еремин', city: 'Казань', district: 'Вахитовский', bio: 'Настолки, музыка, хорошая компания.' },
  { first: 'Анна', last: 'Козлова', city: 'Самара', district: 'Ленинский', bio: 'Пеку и собираю друзей за большим столом.' },
  { first: 'Дмитрий', last: 'Волков', city: 'Екатеринбург', district: 'Центр', bio: 'Кинопоказы и обсуждения после.' },
  { first: 'Ольга', last: 'Морозова', city: 'Новосибирск', district: 'Заельцовский', bio: 'Йога, чай и спокойные вечера.' },
  { first: 'Иван', last: 'Лебедев', city: 'Тверь', district: 'Центр', bio: 'Гитара, костер и хорошие истории.' },
  { first: 'Екатерина', last: 'Соколова', city: 'Нижний Новгород', district: 'Нижегородский', bio: 'Мастер-классы и творческие встречи.' },
  { first: 'Павел', last: 'Новиков', city: 'Краснодар', district: 'Центральный', bio: 'Квизы, мафия и командные игры.' },
  { first: 'Наталья', last: 'Павлова', city: 'Уфа', district: 'Кировский', bio: 'Поэзия, вино и разговоры о важном.' },
  { first: 'Максим', last: 'Орлов', city: 'Москва', district: 'Арбат', bio: 'Джаз, фотография и прогулки по городу.' },
  { first: 'Юлия', last: 'Андреева', city: 'Санкт-Петербург', district: 'Петроградский', bio: 'Танцы, бранчи и новые знакомства.' },
  { first: 'Артем', last: 'Макаров', city: 'Казань', district: 'Приволжский', bio: 'Кулинарные эксперименты и настолки.' },
  { first: 'Светлана', last: 'Никитина', city: 'Самара', district: 'Октябрьский', bio: 'Люблю театр и камерные вечера.' },
  { first: 'Роман', last: 'Захаров', city: 'Екатеринбург', district: 'Верх-Исетский', bio: 'Акустика, винил и хороший звук.' },
  { first: 'Ксения', last: 'Белова', city: 'Новосибирск', district: 'Центральный', bio: 'Фотопрогулки и городские истории.' },
  { first: 'Егор', last: 'Григорьев', city: 'Тверь', district: 'Заволжский', bio: 'Пикники, велосипед и свежий воздух.' },
  { first: 'Алина', last: 'Комарова', city: 'Нижний Новгород', district: 'Советский', bio: 'Керамика, чай и неспешные вечера.' },
  { first: 'Никита', last: 'Федоров', city: 'Краснодар', district: 'Прикубанский', bio: 'Спорт, барбекю и хорошая музыка.' },
  { first: 'Дарья', last: 'Крылова', city: 'Уфа', district: 'Советский', bio: 'Книги, кофе и уютные разговоры.' },
  { first: 'Владимир', last: 'Кузнецов', city: 'Москва', district: 'Сокол', bio: 'Лекции, кино и интеллектуальные вечера.' },
  { first: 'Полина', last: 'Васильева', city: 'Санкт-Петербург', district: 'Невский', bio: 'Арт-встречи и выставки.' },
  { first: 'Андрей', last: 'Михайлов', city: 'Казань', district: 'Ново-Савиновский', bio: 'Готовлю и собираю друзей.' },
  { first: 'Виктория', last: 'Соловьева', city: 'Самара', district: 'Самарский', bio: 'Караоке, танцы и отличное настроение.' },
]

const ACTIVITIES = [
  'Кинопоказ под открытым небом',
  'Настольные игры до утра',
  'Акустический квартирник',
  'Книжный клуб: обсуждаем роман',
  'Мастер-класс по керамике',
  'Джазовый вечер',
  'Пикник в парке',
  'Кулинарный баттл',
  'Лекция о кино',
  'Играем в мафию',
  'Винный вечер',
  'Фотопрогулка',
  'Йога на закате',
  'Поэтический вечер',
  'Чайная церемония',
  'Караоке-вечер',
  'Экскурсия по городу',
  'Бранч по-домашнему',
  'Танцевальный вечер',
  'Квиз-вечер',
]

const DESCRIPTIONS = [
  'Собираемся небольшой компанией, чтобы познакомиться, поговорить и хорошо провести время. Приходите с хорошим настроением — остальное организуем.',
  'Камерная встреча для тех, кто любит живое общение без суеты. Будет тепло, интересно и по-домашнему.',
  'Приходите знакомиться, делиться историями и находить новых друзей. Формат свободный, атмосфера дружелюбная.',
  'Небольшой вечер для своих: обсудим интересную тему, послушаем музыку и просто побудем вместе.',
  'Организуем уютный вечер с напитками и закусками. Главное — хорошая компания и желание общаться.',
]

const THEMES = ['Кино', 'Настолки', 'Музыка', 'Книжный клуб', 'Мастер-класс', 'Другое']

type SeededUser = { id: string; city: string; nickname: string }

async function uniqueNickname(base: string, taken: Set<string>): Promise<string> {
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let n = 2
  while (taken.has(`${base}_${n}`)) n += 1
  const result = `${base}_${n}`
  taken.add(result)
  return result
}

function atTime(daysFromNow: number, hour = 19): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, 0, 0, 0)
  return date
}

async function main() {
  console.log('Removing previous seed users (seed.*@example.com)...')
  await prisma.user.deleteMany({ where: { email: { startsWith: 'seed.' } } })

  const existingProfiles = await prisma.profile.findMany({ select: { nickname: true } })
  const takenNicknames = new Set(existingProfiles.map((profile) => profile.nickname))
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const users: SeededUser[] = []
  for (let i = 0; i < PEOPLE.length; i += 1) {
    const person = PEOPLE[i]
    const city = normalizeCity(person.city)
    const nickname = await uniqueNickname(`${person.first}_${person.last}`, takenNicknames)

    const user = await prisma.user.create({
      data: {
        email: `seed.user${i + 1}@example.com`,
        passwordHash,
        status: 'active',
        profile: {
          create: {
            nickname,
            bio: person.bio,
            avatarUrl: `https://i.pravatar.cc/200?img=${(i % 70) + 1}`,
            district: person.district,
            city,
            trustScore: Number((3.8 + (i % 7) * 0.2).toFixed(1)),
            isVerified: i % 5 === 0,
          },
        },
      },
      select: { id: true },
    })

    users.push({ id: user.id, city, nickname })
  }

  console.log(`Created ${users.length} seed users`)

  let eventCount = 0
  let guestCount = 0

  // 24 ближайших события — по одному у каждого сид-пользователя.
  for (let i = 0; i < users.length; i += 1) {
    const host = users[i]
    const startsAt = atTime(i + 1)
    const event = await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${ACTIVITIES[i % ACTIVITIES.length]} · ${host.city}`,
        description: DESCRIPTIONS[i % DESCRIPTIONS.length],
        theme: THEMES[i % THEMES.length],
        city: host.city,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 8 + (i % 15),
        status: 'published' as EventStatus,
        rules: { 'Что взять': 'Хорошее настроение', 'Дресс-код': 'Свободный' },
      },
      select: { id: true },
    })
    eventCount += 1

    const guests: { eventId: string; userId: string; status: GuestStatus }[] = []
    const number = 2 + (i % 5)
    for (let g = 1; g <= number; g += 1) {
      const guest = users[(i + g) % users.length]
      if (guest.id === host.id) continue
      guests.push({
        eventId: event.id,
        userId: guest.id,
        status: (i % 3 === 0 ? 'pending' : 'approved') as GuestStatus,
      })
    }
    if (guests.length > 0) {
      await prisma.eventGuest.createMany({ data: guests, skipDuplicates: true })
      guestCount += guests.length
    }
  }

  // 24 прошедших события — «воспоминания» для каждого сид-пользователя.
  for (let i = 0; i < users.length; i += 1) {
    const host = users[i]
    const startsAt = atTime(-(i + 1) * 2)
    const status: EventStatus =
      i % 4 === 0 ? 'published' : i % 4 === 1 ? 'archived' : 'closed'

    const event = await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${ACTIVITIES[(i + 7) % ACTIVITIES.length]} · ${host.city}`,
        description: DESCRIPTIONS[(i + 2) % DESCRIPTIONS.length],
        theme: THEMES[(i + 3) % THEMES.length],
        city: host.city,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 8 + ((i + 4) % 15),
        status,
        rules: { 'Что взять': 'Фотографии и воспоминания', 'Дресс-код': 'Свободный' },
      },
      select: { id: true },
    })
    eventCount += 1

    const guests: { eventId: string; userId: string; status: GuestStatus }[] = []
    const number = 3 + (i % 4)
    for (let g = 1; g <= number; g += 1) {
      const guest = users[(i + g + 3) % users.length]
      if (guest.id === host.id) continue
      guests.push({ eventId: event.id, userId: guest.id, status: 'attended' as GuestStatus })
    }
    if (guests.length > 0) {
      await prisma.eventGuest.createMany({ data: guests, skipDuplicates: true })
      guestCount += guests.length
    }
  }

  // Ещё два будущих события, чтобы лента была чуть богаче.
  for (let i = 0; i < 2; i += 1) {
    const host = users[i]
    const startsAt = atTime(31 + i * 5)
    await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${ACTIVITIES[(i + 13) % ACTIVITIES.length]} · ${host.city}`,
        description: DESCRIPTIONS[(i + 4) % DESCRIPTIONS.length],
        theme: THEMES[(i + 2) % THEMES.length],
        city: host.city,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 12 + i * 4,
        status: 'published' as EventStatus,
      },
      select: { id: true },
    })
    eventCount += 1
  }

  // Каждый сид-пользователь подписан на трёх следующих.
  const subscriptions: { followerId: string; followingId: string }[] = []
  for (let i = 0; i < users.length; i += 1) {
    for (let offset = 1; offset <= 3; offset += 1) {
      const target = users[(i + offset) % users.length]
      if (target.id !== users[i].id) {
        subscriptions.push({ followerId: users[i].id, followingId: target.id })
      }
    }
  }
  await prisma.subscription.createMany({ data: subscriptions, skipDuplicates: true })

  console.log('Seed complete:')
  console.log(`  users: ${users.length}`)
  console.log(`  events: ${eventCount} (26 upcoming, 24 past)`)
  console.log(`  event guests: ${guestCount}`)
  console.log(`  subscriptions: ${subscriptions.length}`)
  console.log(`  demo login: seed.user1@example.com / ${PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
