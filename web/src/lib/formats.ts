// Mock-каталог форматов и подкатегорий для главной и экрана формата.
// weeklyCount — мок-агрегат «встреч на неделе»; позже заменим на реальный
// подсчёт из БД. Слаги subcategory совпадают с api/prisma/seed.ts.

export type EventFormat = 'offline' | 'sport' | 'online'

export type Subcategory = {
  slug: string
  label: string
  emoji: string
  weeklyCount: number
}

export type FormatMeta = {
  slug: EventFormat
  label: string
  shortLabel: string
  emoji: string
  gradient: string
  weeklyCount: number
  subcategories: Subcategory[]
}

const RAW_FORMATS: Omit<FormatMeta, 'weeklyCount'>[] = [
  {
    slug: 'offline',
    label: 'Офлайн рядом',
    shortLabel: 'Офлайн',
    emoji: '🏠',
    gradient:
      'from-indigo-100 via-indigo-50 to-white dark:from-indigo-500/25 dark:via-slate-800 dark:to-slate-800',
    subcategories: [
      { slug: 'cinema', label: 'Кино и обсуждение', emoji: '🎬', weeklyCount: 8 },
      { slug: 'board-games', label: 'Настолки', emoji: '🎲', weeklyCount: 12 },
      { slug: 'music', label: 'Музыка и гитара', emoji: '🎸', weeklyCount: 7 },
      { slug: 'cooking', label: 'Кулинария и ужины', emoji: '🍕', weeklyCount: 6 },
      { slug: 'book-club', label: 'Книжный клуб', emoji: '📚', weeklyCount: 5 },
      { slug: 'workshops', label: 'Мастер-классы', emoji: '🎨', weeklyCount: 4 },
      { slug: 'quiet-evenings', label: 'Тихие вечера', emoji: '🕯', weeklyCount: 5 },
      { slug: 'dnd', label: 'D&D и ролевки', emoji: '🐉', weeklyCount: 4 },
      { slug: 'other', label: 'Другое', emoji: '✨', weeklyCount: 6 },
    ],
  },
  {
    slug: 'sport',
    label: 'Спорт',
    shortLabel: 'Спорт',
    emoji: '🏟',
    gradient:
      'from-emerald-100 via-emerald-50 to-white dark:from-emerald-500/25 dark:via-slate-800 dark:to-slate-800',
    subcategories: [
      { slug: 'volleyball', label: 'Волейбол', emoji: '🏐', weeklyCount: 7 },
      { slug: 'football', label: 'Футбол', emoji: '⚽', weeklyCount: 9 },
      { slug: 'paddle-tennis', label: 'Падел и теннис', emoji: '🎾', weeklyCount: 5 },
      { slug: 'cycling', label: 'Велопрогулки', emoji: '🚴', weeklyCount: 6 },
      { slug: 'running', label: 'Бег и ходьба', emoji: '🏃', weeklyCount: 8 },
      { slug: 'hiking', label: 'Походы', emoji: '🥾', weeklyCount: 4 },
      { slug: 'park-chess', label: 'Шахматы в парке', emoji: '♟', weeklyCount: 3 },
      { slug: 'frisbee', label: 'Фрисби', emoji: '🥏', weeklyCount: 3 },
      { slug: 'yoga', label: 'Йога', emoji: '🧘', weeklyCount: 6 },
    ],
  },
  {
    slug: 'online',
    label: 'Онлайн',
    shortLabel: 'Онлайн',
    emoji: '💻',
    gradient:
      'from-purple-100 via-purple-50 to-white dark:from-purple-500/25 dark:via-slate-800 dark:to-slate-800',
    subcategories: [
      { slug: 'online-games', label: 'Онлайн-игры и тиммейты', emoji: '🎮', weeklyCount: 10 },
      { slug: 'co-op-games', label: 'Кооп-игры', emoji: '🤝', weeklyCount: 8 },
      { slug: 'dnd-online', label: 'D&D онлайн', emoji: '🐉', weeklyCount: 5 },
      { slug: 'coworking', label: 'Коворкинг', emoji: '🧑‍💻', weeklyCount: 7 },
      { slug: 'watch-party', label: 'Watch-party', emoji: '🍿', weeklyCount: 9 },
      { slug: 'language-exchange', label: 'Языковой обмен', emoji: '🗣', weeklyCount: 6 },
      { slug: 'online-board-games', label: 'Онлайн-настолки', emoji: '🎲', weeklyCount: 5 },
      { slug: 'quizzes', label: 'Квизы', emoji: '🧠', weeklyCount: 11 },
    ],
  },
]

export const FORMATS: FormatMeta[] = RAW_FORMATS.map((format) => ({
  ...format,
  weeklyCount: format.subcategories.reduce((sum, sub) => sum + sub.weeklyCount, 0),
}))

export const FORMAT_BY_SLUG: Record<EventFormat, FormatMeta> = Object.fromEntries(
  FORMATS.map((format) => [format.slug, format]),
) as Record<EventFormat, FormatMeta>

export const ALL_EVENTS_WEEKLY_COUNT = FORMATS.reduce(
  (sum, format) => sum + format.weeklyCount,
  0,
)

export const ALL_FORMAT_TILE = {
  label: 'Все события',
  emoji: '🎉',
  gradient:
    'from-sky-100 via-blue-50 to-white dark:from-sky-500/25 dark:via-slate-800 dark:to-slate-800',
  weeklyCount: ALL_EVENTS_WEEKLY_COUNT,
}

/**
 * Mock-фильтрация счётчиков по городу: без города — полный каталог,
 * с городом — детерминированная доля встреч (35–65%) от общего числа.
 * Одинаковый город даёт одинаковые цифры между рендерами и экранами.
 */
export function countForCity(base: number, city: string | null, key = ''): number {
  if (!city) return base
  const seed = `${city.toLowerCase()}:${key}`
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const share = 0.35 + (hash % 31) / 100
  return Math.max(1, Math.round(base * share))
}

export function isEventFormat(value: string): value is EventFormat {
  return value === 'offline' || value === 'sport' || value === 'online'
}

export function findSubcategory(slug?: string | null) {
  if (!slug) return undefined
  for (const format of FORMATS) {
    const subcategory = format.subcategories.find((item) => item.slug === slug)
    if (subcategory) return { ...subcategory, format }
  }
  return undefined
}

export type PopularItem = {
  label: string
  count: number
  subcategory?: string
  district?: string
  search?: string
}

export type PopularColumn = {
  title: string
  items: PopularItem[]
}

export const POPULAR_LINKS: Record<EventFormat, PopularColumn[]> = {
  offline: [
    {
      title: 'Площадки',
      items: [
        { label: 'Лофт «Фабрика»', count: 7, search: 'Лофт' },
        { label: 'Антикафе «Циферблат»', count: 5, search: 'Антикафе' },
        { label: 'Библиотека «Тургеневка»', count: 4, search: 'Библиотека' },
      ],
    },
    {
      title: 'Районы',
      items: [
        { label: 'Хамовники', count: 9, district: 'Хамовники' },
        { label: 'Арбат', count: 6, district: 'Арбат' },
        { label: 'Сокол', count: 4, district: 'Сокол' },
      ],
    },
    {
      title: 'Темы',
      items: [
        { label: 'Настолки', count: 12, subcategory: 'board-games' },
        { label: 'Кино и обсуждение', count: 8, subcategory: 'cinema' },
        { label: 'Тихие вечера', count: 5, subcategory: 'quiet-evenings' },
      ],
    },
  ],
  sport: [
    {
      title: 'Площадки',
      items: [
        { label: 'Стадион «Труд»', count: 8, search: 'Стадион' },
        { label: 'Парк Горького', count: 7, search: 'Парк' },
        { label: 'Сквер у реки', count: 4, search: 'Сквер' },
      ],
    },
    {
      title: 'Районы',
      items: [
        { label: 'Хамовники', count: 7, district: 'Хамовники' },
        { label: 'Арбат', count: 5, district: 'Арбат' },
        { label: 'Сокол', count: 4, district: 'Сокол' },
      ],
    },
    {
      title: 'Игры',
      items: [
        { label: 'Футбол', count: 9, subcategory: 'football' },
        { label: 'Волейбол', count: 7, subcategory: 'volleyball' },
        { label: 'Йога', count: 6, subcategory: 'yoga' },
      ],
    },
  ],
  online: [
    {
      title: 'Площадки',
      items: [
        { label: 'Discord', count: 14, search: 'Discord' },
        { label: 'Zoom', count: 9, search: 'Zoom' },
        { label: 'Коворкинг', count: 7, search: 'Коворкинг' },
      ],
    },
    {
      title: 'Сообщества',
      items: [
        { label: 'Игровые серверы', count: 10, subcategory: 'online-games' },
        { label: 'Онлайн-настолки', count: 5, subcategory: 'online-board-games' },
        { label: 'Языковые чаты', count: 5, subcategory: 'language-exchange' },
      ],
    },
    {
      title: 'Игры',
      items: [
        { label: 'Квизы', count: 11, subcategory: 'quizzes' },
        { label: 'Онлайн-игры', count: 10, subcategory: 'online-games' },
        { label: 'Watch-party', count: 9, subcategory: 'watch-party' },
      ],
    },
  ],
}
