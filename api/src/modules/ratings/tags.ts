// Справочник тегов пост-встречных отзывов.
// Слаг — стабильный ключ (хранится в ratings.tag_slug), label можно менять.
// audience: guest — тег для гостя, host — только для организатора встречи.

export type UserTagColor = 'green' | 'yellow' | 'red'
export type UserTagAudience = 'guest' | 'host'

export type UserTagDefinition = {
  slug: string
  label: string
  color: UserTagColor
  audience: UserTagAudience
}

export const USER_TAGS: UserTagDefinition[] = [
  // 🟢 Зелёные — гость
  { slug: 'soul-of-company', label: 'душа компании', color: 'green', audience: 'guest' },
  { slug: 'attentive-listener', label: 'внимательный слушатель', color: 'green', audience: 'guest' },
  { slug: 'easy-communicator', label: 'лёгкий в общении', color: 'green', audience: 'guest' },
  { slug: 'interesting-storyteller', label: 'интересный рассказчик', color: 'green', audience: 'guest' },
  { slug: 'appropriate-humor', label: 'уместный юмор', color: 'green', audience: 'guest' },
  { slug: 'warm-person', label: 'тёплый человек', color: 'green', audience: 'guest' },
  { slug: 'open-to-new', label: 'открытый к новому', color: 'green', audience: 'guest' },
  { slug: 'punctual', label: 'пунктуальный', color: 'green', audience: 'guest' },
  { slug: 'warned-in-advance', label: 'предупредил заранее', color: 'green', audience: 'guest' },
  { slug: 'reliable', label: 'не подвёл', color: 'green', audience: 'guest' },
  { slug: 'brought-treats', label: 'принёс вкусняшки', color: 'green', audience: 'guest' },
  { slug: 'helped-host', label: 'помог хосту', color: 'green', audience: 'guest' },
  { slug: 'shared-gear', label: 'поделился инвентарём', color: 'green', audience: 'guest' },
  { slug: 'good-playlist', label: 'хороший плейлист', color: 'green', audience: 'guest' },
  { slug: 'activity-initiator', label: 'инициатор активности', color: 'green', audience: 'guest' },
  { slug: 'respects-boundaries', label: 'уважает границы', color: 'green', audience: 'guest' },
  { slug: 'no-intrusive-questions', label: 'без лишних вопросов', color: 'green', audience: 'guest' },
  { slug: 'asked-before-photo', label: 'не снимал без спроса', color: 'green', audience: 'guest' },
  { slug: 'calm-debater', label: 'спокойный спорщик', color: 'green', audience: 'guest' },
  // 🟢 Зелёные — хост
  { slug: 'cozy-host', label: 'уютный приём', color: 'green', audience: 'host' },
  { slug: 'well-organized', label: 'чёткая организация', color: 'green', audience: 'host' },
  { slug: 'tasty-food', label: 'вкусно кормит', color: 'green', audience: 'host' },
  { slug: 'good-moderator', label: 'хорошо модерирует', color: 'green', audience: 'host' },
  { slug: 'safe-host', label: 'безопасно', color: 'green', audience: 'host' },

  // 🟡 Жёлтые — гость
  { slug: 'quiet-one', label: 'тихоня', color: 'yellow', audience: 'guest' },
  { slug: 'talkative', label: 'говорил много', color: 'yellow', audience: 'guest' },
  { slug: 'slow-warmup', label: 'долго раскачивается', color: 'yellow', audience: 'guest' },
  { slug: 'left-early', label: 'рано уходит', color: 'yellow', audience: 'guest' },
  { slug: 'loves-debate', label: 'любит поспорить', color: 'yellow', audience: 'guest' },
  { slug: 'deep-topics', label: 'глубокие темы', color: 'yellow', audience: 'guest' },
  { slug: 'self-focused', label: 'о себе', color: 'yellow', audience: 'guest' },
  { slug: 'introvert-mode', label: 'интроверт-режим', color: 'yellow', audience: 'guest' },
  { slug: 'late-but-warns', label: 'опаздывает, но предупреждает', color: 'yellow', audience: 'guest' },
  { slug: 'on-phone', label: 'в телефоне', color: 'yellow', audience: 'guest' },
  { slug: 'own-alcohol', label: 'со своим алкоголем', color: 'yellow', audience: 'guest' },
  { slug: 'many-questions', label: 'задаёт много вопросов', color: 'yellow', audience: 'guest' },

  // 🔴 Красные — гость
  { slug: 'violated-boundaries', label: 'нарушал границы', color: 'red', audience: 'guest' },
  { slug: 'no-permission', label: 'не спросил разрешения', color: 'red', audience: 'guest' },
  { slug: 'pressured-others', label: 'давил на других', color: 'red', audience: 'guest' },
  { slug: 'disrespectful-jokes', label: 'неуважительно шутил', color: 'red', audience: 'guest' },
  { slug: 'aggressive', label: 'был агрессивен', color: 'red', audience: 'guest' },
  { slug: 'toxic', label: 'токсичный', color: 'red', audience: 'guest' },
  { slug: 'personal-attacks', label: 'перешёл на личности', color: 'red', audience: 'guest' },
  { slug: 'drunk', label: 'пьян до неадекватности', color: 'red', audience: 'guest' },
  { slug: 'under-influence', label: 'пришёл под чем-то', color: 'red', audience: 'guest' },
  { slug: 'inappropriate-behavior', label: 'вёл себя неуместно', color: 'red', audience: 'guest' },
  { slug: 'filmed-without-consent', label: 'снимал/записывал без спроса', color: 'red', audience: 'guest' },
  { slug: 'brought-stranger', label: 'привёл постороннего', color: 'red', audience: 'guest' },
  { slug: 'asked-for-tags', label: 'выпрашивал теги и отзывы', color: 'red', audience: 'guest' },
  { slug: 'damaged-property', label: 'испортил инвентарь', color: 'red', audience: 'guest' },
  { slug: 'noisy-after-hours', label: 'шумел после «тихого часа»', color: 'red', audience: 'guest' },
  // 🔴 Красные — хост
  { slug: 'host-cancelled', label: 'хост слил встречу', color: 'red', audience: 'host' },
  { slug: 'host-no-show', label: 'хост не пришёл', color: 'red', audience: 'host' },
  { slug: 'bad-guest-mix', label: 'неадекватный гостевой состав', color: 'red', audience: 'host' },
  { slug: 'no-change-notice', label: 'не предупредил об изменениях', color: 'red', audience: 'host' },
]

const USER_TAG_BY_SLUG = new Map(USER_TAGS.map((tag, index) => [tag.slug, { ...tag, index }]))

export function getUserTag(slug: string) {
  return USER_TAG_BY_SLUG.get(slug)
}

export function isRedUserTag(slug: string) {
  return getUserTag(slug)?.color === 'red'
}

// Красный тег публичен только при консенсусе — 2+ независимых автора.
export const RED_TAG_CONSENSUS = 2

// Теги живут 12 месяцев: старые выдачи не участвуют в публичной выдаче.
export const USER_TAG_TTL_MS = 365 * 24 * 60 * 60 * 1000

// Окно отзывов: 10 часов после окончания встречи ... 72 часа.
export const REVIEW_WINDOW_OPENS_AFTER_MS = 10 * 60 * 60 * 1000
export const REVIEW_WINDOW_CLOSES_AFTER_MS = 72 * 60 * 60 * 1000

export type UserTagRatingRow = {
  tagSlug: string | null
  raterId: string
  createdAt: Date | string
}

export type PublicUserTag = {
  slug: string
  label: string
  color: UserTagColor
  audience: UserTagAudience
  count: number
}

const COLOR_ORDER: Record<UserTagColor, number> = { green: 0, yellow: 1, red: 2 }

function groupTagRatings(
  rows: UserTagRatingRow[],
  opts: { audience?: UserTagAudience; now?: Date } = {},
) {
  const cutoff = (opts.now ?? new Date()).getTime() - USER_TAG_TTL_MS
  const grouped = new Map<string, { tag: UserTagDefinition; index: number; raters: Set<string> }>()

  for (const row of rows) {
    if (!row.tagSlug) continue
    const tag = USER_TAG_BY_SLUG.get(row.tagSlug)
    if (!tag) continue
    if (opts.audience && tag.audience !== opts.audience) continue
    if (new Date(row.createdAt).getTime() < cutoff) continue

    let entry = grouped.get(tag.slug)
    if (!entry) {
      entry = { tag, index: tag.index, raters: new Set() }
      grouped.set(tag.slug, entry)
    }
    // Независимость выдачи — разные авторы, а не количество встреч.
    entry.raters.add(row.raterId)
  }

  return Array.from(grouped.values())
    .map(({ tag, index, raters }) => ({ tag, index, count: raters.size }))
    .sort(
      (a, b) =>
        COLOR_ORDER[a.tag.color] - COLOR_ORDER[b.tag.color] ||
        b.count - a.count ||
        a.index - b.index,
    )
}

function toPublicTag(entry: ReturnType<typeof groupTagRatings>[number]): PublicUserTag {
  return {
    slug: entry.tag.slug,
    label: entry.tag.label,
    color: entry.tag.color,
    audience: entry.tag.audience,
    count: entry.count,
  }
}

// Публичные теги: зелёные/жёлтые — сразу, красные — только при консенсусе.
export function aggregatePublicTags(
  rows: UserTagRatingRow[],
  opts: { audience?: UserTagAudience; now?: Date; limit?: number } = {},
): PublicUserTag[] {
  const publicTags = groupTagRatings(rows, opts)
    .filter((entry) => entry.tag.color !== 'red' || entry.count >= RED_TAG_CONSENSUS)
    .map(toPublicTag)
  return opts.limit ? publicTags.slice(0, opts.limit) : publicTags
}

// Личный сигнал: одиночный красный тег, который ещё не стал публичным.
export function aggregatePersonalSignals(
  rows: UserTagRatingRow[],
  now = new Date(),
): PublicUserTag[] {
  return groupTagRatings(rows, { now })
    .filter((entry) => entry.tag.color === 'red' && entry.count < RED_TAG_CONSENSUS)
    .map(toPublicTag)
}

// Для include в Prisma: все выдачи с тегом; срок и аудиторию фильтруем в JS.
export const HOST_TAG_RATINGS_SELECT = {
  select: { tagSlug: true, raterId: true, createdAt: true },
  where: { tagSlug: { not: null } },
} as const

// Хосту на карточке события показываем только «хостовые» теги.
export function serializeHostTags<T extends { ratingsReceived?: UserTagRatingRow[] }>(host: T) {
  const { ratingsReceived, ...rest } = host
  return {
    ...rest,
    tags: aggregatePublicTags(ratingsReceived ?? [], { audience: 'host', limit: 3 }),
  }
}

export function getReviewWindow(
  event: {
    startsAt: Date
    endsAt: Date | null
    durationMinutes: number | null
  },
  now = new Date(),
) {
  const meetingEnd = event.endsAt
    ? event.endsAt
    : new Date(event.startsAt.getTime() + (event.durationMinutes ?? 0) * 60_000)
  const opensAt = new Date(meetingEnd.getTime() + REVIEW_WINDOW_OPENS_AFTER_MS)
  const closesAt = new Date(meetingEnd.getTime() + REVIEW_WINDOW_CLOSES_AFTER_MS)
  return { opensAt, closesAt, isOpen: opensAt <= now && now <= closesAt }
}
