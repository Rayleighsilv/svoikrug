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

const DESCRIPTIONS = [
  'Собираемся небольшой компанией, чтобы познакомиться, поговорить и хорошо провести время. Приходите с хорошим настроением — остальное организуем.',
  'Камерная встреча для тех, кто любит живое общение без суеты. Будет тепло, интересно и по-домашнему.',
  'Приходите знакомиться, делиться историями и находить новых друзей. Формат свободный, атмосфера дружелюбная.',
  'Небольшой вечер для своих: обсудим интересную тему, послушаем музыку и просто побудем вместе.',
  'Организуем уютный вечер с напитками и закусками. Главное — хорошая компания и желание общаться.',
]

// Слаги subcategory должны совпадать с mock-каталогом web/src/lib/formats.ts.
type SeedFormat = 'offline' | 'sport' | 'online'
type SeedCategory = {
  format: SeedFormat
  subcategory: string
  theme: string
  title: string
}

const FORMAT_CATEGORIES: SeedCategory[] = [
  { format: 'offline', subcategory: 'cinema', theme: 'Кино', title: 'Кинопоказ и обсуждение' },
  { format: 'offline', subcategory: 'board-games', theme: 'Настолки', title: 'Настольные игры до утра' },
  { format: 'offline', subcategory: 'music', theme: 'Музыка', title: 'Акустический квартирник' },
  { format: 'offline', subcategory: 'cooking', theme: 'Другое', title: 'Кулинарный ужин' },
  { format: 'offline', subcategory: 'book-club', theme: 'Книжный клуб', title: 'Книжный клуб: обсуждаем роман' },
  { format: 'offline', subcategory: 'workshops', theme: 'Мастер-класс', title: 'Мастер-класс по керамике' },
  { format: 'offline', subcategory: 'quiet-evenings', theme: 'Другое', title: 'Тихий вечер при свечах' },
  { format: 'offline', subcategory: 'dnd', theme: 'Настолки', title: 'D&D: новая кампания' },
  { format: 'offline', subcategory: 'other', theme: 'Другое', title: 'Камерная встреча' },
  { format: 'sport', subcategory: 'volleyball', theme: 'Спорт', title: 'Волейбол на площадке' },
  { format: 'sport', subcategory: 'football', theme: 'Спорт', title: 'Футбол во дворе' },
  { format: 'sport', subcategory: 'paddle-tennis', theme: 'Спорт', title: 'Падел и теннис' },
  { format: 'sport', subcategory: 'cycling', theme: 'Спорт', title: 'Велопрогулка по городу' },
  { format: 'sport', subcategory: 'running', theme: 'Спорт', title: 'Бег и ходьба' },
  { format: 'sport', subcategory: 'hiking', theme: 'Спорт', title: 'Поход выходного дня' },
  { format: 'sport', subcategory: 'park-chess', theme: 'Спорт', title: 'Шахматы в парке' },
  { format: 'sport', subcategory: 'frisbee', theme: 'Спорт', title: 'Фрисби на поляне' },
  { format: 'sport', subcategory: 'yoga', theme: 'Спорт', title: 'Йога на закате' },
  { format: 'online', subcategory: 'online-games', theme: 'Онлайн', title: 'Онлайн-игры и тиммейты' },
  { format: 'online', subcategory: 'co-op-games', theme: 'Онлайн', title: 'Кооп-игры вечером' },
  { format: 'online', subcategory: 'dnd-online', theme: 'Онлайн', title: 'D&D онлайн' },
  { format: 'online', subcategory: 'coworking', theme: 'Онлайн', title: 'Коворкинг-сессия' },
  { format: 'online', subcategory: 'watch-party', theme: 'Онлайн', title: 'Watch-party' },
  { format: 'online', subcategory: 'language-exchange', theme: 'Онлайн', title: 'Языковой обмен' },
  { format: 'online', subcategory: 'online-board-games', theme: 'Онлайн', title: 'Онлайн-настолки' },
  { format: 'online', subcategory: 'quizzes', theme: 'Онлайн', title: 'Квиз-вечер' },
]

const VENUES: Record<SeedFormat, string[]> = {
  offline: ['Лофт «Фабрика»', 'Антикафе «Циферблат»', 'Библиотека «Тургеневка»'],
  sport: ['Стадион «Труд»', 'Парк Горького', 'Сквер у реки'],
  online: ['Discord', 'Zoom', 'Коворкинг'],
}

function seedCategory(index: number): SeedCategory {
  return FORMAT_CATEGORIES[index % FORMAT_CATEGORIES.length]
}

function venueFor(category: SeedCategory, index: number): string {
  const venues = VENUES[category.format]
  return venues[index % venues.length]
}

// Должно совпадать с сидом миграции add_event_tags_and_cover.
const TAG_SLUGS = [
  'introvert-friendly',
  'deep-talks',
  'loud-and-fun',
  'phone-free',
  'cozy',
  'creative-mess',
  'networking',
  'dating',
  'byob',
  'vegan-friendly',
  'kids-welcome',
  'fashionably-late',
  'geeky',
  'esoteric',
  'crypto-investing',
  'psych-games',
  'standup-improv',
]

// Три разных тега на событие: индексы i, i+5, i+9 не совпадают по модулю 17.
function tagsFor(index: number) {
  return {
    create: [
      { tagSlug: TAG_SLUGS[index % TAG_SLUGS.length] },
      { tagSlug: TAG_SLUGS[(index + 5) % TAG_SLUGS.length] },
      { tagSlug: TAG_SLUGS[(index + 9) % TAG_SLUGS.length] },
    ],
  }
}

const STREETS = ['ул. Ленина', 'ул. Пушкина', 'ул. Садовая', 'ул. Лесная', 'ул. Гоголя']

type SeededUser = {
  id: string
  city: string
  district: string
  nickname: string
  avatarUrl: string
  trustScore: number
}

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
    const avatarUrl = `https://i.pravatar.cc/200?img=${(i % 70) + 1}`
    const trustScore = Number((3.8 + (i % 7) * 0.2).toFixed(1))

    const user = await prisma.user.create({
      data: {
        email: `seed.user${i + 1}@example.com`,
        passwordHash,
        status: 'active',
        profile: {
          create: {
            nickname,
            bio: person.bio,
            avatarUrl,
            district: person.district,
            city,
            birthDate: new Date(Date.UTC(1985 + (i % 16), i % 12, 1 + (i % 27))),
            trustScore,
            isVerified: i % 5 === 0,
          },
        },
      },
      select: { id: true },
    })

    users.push({
      id: user.id,
      city,
      district: person.district,
      nickname,
      avatarUrl,
      trustScore,
    })
  }

  console.log(`Created ${users.length} seed users`)

  let eventCount = 0
  let guestCount = 0
  let ratingCount = 0
  let notificationCount = 0
  const ratingsByHost = new Map<string, number[]>()
  const upcomingEvents: { eventId: string; title: string; hostNickname: string }[] = []

  // 26 ближайших событий на неделю вперёд: все форматы и подкатегории.
  for (let i = 0; i < users.length; i += 1) {
    const host = users[i]
    const category = seedCategory(i)
    const venue = venueFor(category, i)
    const startsAt = atTime((i % 7) + 1)
    const isOnline = category.format === 'online'
    const applicationQuestion =
      i % 3 === 0 ? 'Что вам ближе: тихий вечер или громкая компания?' : null
    const event = await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${category.title} · ${host.city}`,
        description: `${DESCRIPTIONS[i % DESCRIPTIONS.length]} Встречаемся: ${venue}.`,
        theme: category.theme,
        format: category.format,
        subcategory: category.subcategory,
        applicationQuestion,
        coverImageUrl: `https://picsum.photos/seed/svoikrug-${i + 1}/900/600`,
        city: host.city,
        addressPublic: isOnline ? `Онлайн · ${venue}` : `${host.city}, ${host.district}, квартал ${1 + (i % 9)}`,
        addressPrivate: isOnline
          ? `Ссылка на ${venue} придёт после подтверждения`
          : `${STREETS[i % STREETS.length]}, д. ${1 + (i % 30)}, кв. ${1 + (i % 60)}, код ${1000 + i}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 8 + (i % 15),
        status: 'published' as EventStatus,
        rules: { 'Что взять': 'Хорошее настроение', 'Дресс-код': 'Свободный' },
        tags: tagsFor(i),
      },
      select: { id: true, title: true },
    })
    eventCount += 1
    upcomingEvents.push({
      eventId: event.id,
      title: event.title,
      hostNickname: host.nickname,
    })

    const guests: {
      eventId: string
      userId: string
      status: GuestStatus
      applicationAnswer?: string | null
    }[] = []
    const number = 2 + (i % 5)
    for (let g = 1; g <= number; g += 1) {
      const guest = users[(i + g) % users.length]
      if (guest.id === host.id) continue
      const status = (i % 3 === 0 ? 'pending' : 'approved') as GuestStatus
      guests.push({
        eventId: event.id,
        userId: guest.id,
        status,
        applicationAnswer:
          status === 'pending' && applicationQuestion
            ? 'Люблю спокойные вечера и разговоры о важном.'
            : null,
      })
    }
    if (guests.length > 0) {
      await prisma.eventGuest.createMany({ data: guests, skipDuplicates: true })
      guestCount += guests.length
    }

    // Заявки хосту попадают в уведомления — как при реальном «хочу пойти».
    for (const guest of guests.filter((item) => item.status === 'pending')) {
      const guestUser = users.find((item) => item.id === guest.userId)
      if (!guestUser) continue
      await prisma.notification.create({
        data: {
          userId: host.id,
          type: 'RSVP_REQUEST',
          payload: {
            eventId: event.id,
            eventTitle: event.title,
            guestId: guest.userId,
            guestNickname: guestUser.nickname,
            guestAvatarUrl: guestUser.avatarUrl,
            guestTrustScore: guestUser.trustScore,
            applicationAnswer: guest.applicationAnswer ?? null,
          },
        },
      })
      notificationCount += 1
    }
  }

  // 24 прошедших события — «воспоминания» для каждого сид-пользователя.
  for (let i = 0; i < users.length; i += 1) {
    const host = users[i]
    const category = seedCategory(i + 7)
    const venue = venueFor(category, i + 2)
    const isOnline = category.format === 'online'
    const startsAt = atTime(-(i + 1) * 2)
    const status: EventStatus =
      i % 4 === 0 ? 'published' : i % 4 === 1 ? 'archived' : 'closed'

    const event = await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${category.title} · ${host.city}`,
        description: `${DESCRIPTIONS[(i + 2) % DESCRIPTIONS.length]} Встречаемся: ${venue}.`,
        theme: category.theme,
        format: category.format,
        subcategory: category.subcategory,
        coverImageUrl: `https://picsum.photos/seed/svoikrug-past-${i + 1}/900/600`,
        city: host.city,
        addressPublic: isOnline
          ? `Онлайн · ${venue}`
          : `${host.city}, ${host.district}, квартал ${1 + ((i + 2) % 9)}`,
        addressPrivate: isOnline
          ? `Ссылка на ${venue} придёт после подтверждения`
          : `${STREETS[(i + 2) % STREETS.length]}, д. ${1 + ((i + 2) % 30)}, кв. ${1 + ((i + 2) % 60)}, код ${1000 + i}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 8 + ((i + 4) % 15),
        status,
        rules: { 'Что взять': 'Фотографии и воспоминания', 'Дресс-код': 'Свободный' },
        tags: tagsFor(i + 7),
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

    // Прошедшее событие — повод оставить отзыв хосту. Два гостя оценивают
    // организатора, чтобы в карточках был виден рейтинг и число отзывов.
    const raters = guests.slice(0, 2)
    for (let r = 0; r < raters.length; r += 1) {
      const score = 4 + ((i + r) % 2)
      await prisma.rating.create({
        data: {
          eventId: event.id,
          raterId: raters[r].userId,
          ratedId: host.id,
          score,
          comment: score === 5 ? 'Отличная встреча, спасибо!' : 'Было тепло и уютно.',
        },
      })
      const scores = ratingsByHost.get(host.id) ?? []
      scores.push(score)
      ratingsByHost.set(host.id, scores)
      ratingCount += 1
    }
  }

  // Пересчитываем trustScore по фактическим оценкам (как в RatingService).
  for (const [userId, scores] of ratingsByHost) {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const trustScore = Number(average.toFixed(2))
    await prisma.profile.update({
      where: { userId },
      data: { trustScore },
    })
    const seededUser = users.find((user) => user.id === userId)
    if (seededUser) seededUser.trustScore = trustScore
  }

  // Ещё два будущих события, чтобы закрыть оставшиеся подкатегории.
  for (let i = 0; i < 2; i += 1) {
    const host = users[i]
    const category = seedCategory(24 + i)
    const venue = venueFor(category, i + 1)
    const isOnline = category.format === 'online'
    const startsAt = atTime(3 + i)
    await prisma.event.create({
      data: {
        hostId: host.id,
        title: `${category.title} · ${host.city}`,
        description: `${DESCRIPTIONS[(i + 4) % DESCRIPTIONS.length]} Встречаемся: ${venue}.`,
        theme: category.theme,
        format: category.format,
        subcategory: category.subcategory,
        coverImageUrl: `https://picsum.photos/seed/svoikrug-extra-${i + 1}/900/600`,
        city: host.city,
        addressPublic: isOnline
          ? `Онлайн · ${venue}`
          : `${host.city}, ${host.district}, квартал ${1 + ((i + 5) % 9)}`,
        addressPrivate: isOnline
          ? `Ссылка на ${venue} придёт после подтверждения`
          : `${STREETS[(i + 5) % STREETS.length]}, д. ${1 + ((i + 5) % 30)}, кв. ${1 + ((i + 5) % 60)}, код ${1000 + i}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        maxGuests: 12 + i * 4,
        status: 'published' as EventStatus,
        tags: tagsFor(i + 3),
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

  // Новые события от тех, на кого подписан пользователь, — для группы
  // «Мои события» в уведомлениях.
  for (let i = 0; i < users.length; i += 1) {
    const target = upcomingEvents[(i + 1) % upcomingEvents.length]
    if (!target) continue
    await prisma.notification.create({
      data: {
        userId: users[i].id,
        type: 'NEW_EVENT_FROM_SUBSCRIPTION',
        payload: {
          eventId: target.eventId,
          title: target.title,
          hostName: target.hostNickname,
        },
      },
    })
    notificationCount += 1
  }

  console.log('Seed complete:')
  console.log(`  users: ${users.length}`)
  console.log(`  events: ${eventCount} (26 upcoming, 24 past)`)
  console.log(`  event guests: ${guestCount}`)
  console.log(`  ratings: ${ratingCount}`)
  console.log(`  notifications: ${notificationCount}`)
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
