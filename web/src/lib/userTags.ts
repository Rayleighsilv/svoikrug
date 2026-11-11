// Справочник тегов пост-встречных отзывов. Дублирует
// api/src/modules/ratings/tags.ts: слаг — стабильный ключ, порядок общий.

export type UserTagColor = 'green' | 'yellow' | 'red'
export type UserTagAudience = 'guest' | 'host'

export type UserTagDefinition = {
  slug: string
  label: string
  color: UserTagColor
  audience: UserTagAudience
}

export type PublicUserTag = {
  slug: string
  label: string
  color: UserTagColor
  audience: UserTagAudience
  count: number
}

export const USER_TAGS: UserTagDefinition[] = [
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
  { slug: 'cozy-host', label: 'уютный приём', color: 'green', audience: 'host' },
  { slug: 'well-organized', label: 'чёткая организация', color: 'green', audience: 'host' },
  { slug: 'tasty-food', label: 'вкусно кормит', color: 'green', audience: 'host' },
  { slug: 'good-moderator', label: 'хорошо модерирует', color: 'green', audience: 'host' },
  { slug: 'safe-host', label: 'безопасно', color: 'green', audience: 'host' },

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
  { slug: 'host-cancelled', label: 'хост слил встречу', color: 'red', audience: 'host' },
  { slug: 'host-no-show', label: 'хост не пришёл', color: 'red', audience: 'host' },
  { slug: 'bad-guest-mix', label: 'неадекватный гостевой состав', color: 'red', audience: 'host' },
  { slug: 'no-change-notice', label: 'не предупредил об изменениях', color: 'red', audience: 'host' },
]

export const USER_TAG_COLOR_LABELS: Record<UserTagColor, string> = {
  green: '🟢 Положительные',
  yellow: '🟡 Нейтральные',
  red: '🔴 Негативные',
}

export const USER_TAG_COLOR_STYLES: Record<UserTagColor, string> = {
  green: 'bg-green-100 text-green-800 ring-green-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
}

export function userTagsForAudience(audience: UserTagAudience) {
  return USER_TAGS.filter((tag) => tag.audience === audience)
}

export function getUserTagDefinition(slug: string) {
  return USER_TAGS.find((tag) => tag.slug === slug)
}
