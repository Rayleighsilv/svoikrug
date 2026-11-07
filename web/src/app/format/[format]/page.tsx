'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import {
  FORMAT_BY_SLUG,
  countForCity,
  findSubcategory,
  isEventFormat,
} from '@/lib/formats'
import { meetingsWord } from '@/lib/reviews'
import { isTagAllowed, useTags } from '@/lib/tags'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import CategoryTile from '@/components/CategoryTile'
import EventCard, { type EventCardEvent } from '@/components/EventCard'
import EventListSkeleton from '@/components/EventListSkeleton'
import Header from '@/components/Header'
import OfflineFeed from '@/components/OfflineFeed'
import VibeFilter from '@/components/VibeFilter'

type EventItem = EventCardEvent

function isUpcoming(event: { startsAt: string }): boolean {
  const startsAt = new Date(event.startsAt).getTime()
  return !Number.isNaN(startsAt) && startsAt >= Date.now()
}

export default function FormatPage({ params }: { params: { format: string } }) {
  const formatMeta = isEventFormat(params.format) ? FORMAT_BY_SLUG[params.format] : null
  const formatSlug = formatMeta?.slug
  const { city, ready: cityReady } = useCity()
  const online = useOnlineStatus()
  const { tags: tagCatalog } = useTags()

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [subcategory, setSubcategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [localOnly, setLocalOnly] = useState(false)

  // При смене формата сбрасываем фильтры предыдущего экрана.
  // Географию читаем из URL: состояние чипа живёт в ?local=1.
  useEffect(() => {
    setSubcategory('')
    setTags([])
    const params = new URLSearchParams(window.location.search)
    setLocalOnly(params.get('local') === '1')
  }, [params.format])

  useEffect(() => {
    if (!formatSlug || !cityReady) return

    // Без сети оставляем плитки и показываем сохранённые события.
    if (!online) {
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const query = new URLSearchParams({
      status: 'published',
      limit: '200',
      format: formatSlug,
    })
    if (city) query.set('city', city)
    if (formatSlug === 'online' && localOnly) query.set('local', '1')
    if (subcategory) query.set('subcategory', subcategory)
    for (const tag of tags) query.append('tag', tag)

    api
      .get<{ success: boolean; events: EventItem[] }>(`/events?${query.toString()}`)
      .then((data) => {
        if (!cancelled) setEvents((data.events || []).filter(isUpcoming))
      })
      .catch((err) => {
        console.error('Ошибка загрузки событий формата:', err)
        if (!cancelled) setError('Не удалось загрузить встречи. Попробуйте позже.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [formatSlug, city, cityReady, online, subcategory, tags, localOnly, reloadKey])

  const toggleLocalOnly = () => {
    const next = !localOnly
    setLocalOnly(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('local', '1')
    else url.searchParams.delete('local')
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }

  const selectSubcategory = (slug: string) => {
    setSubcategory((current) => (current === slug ? '' : slug))
  }

  const resetFilters = () => {
    setSubcategory('')
    setTags([])
  }

  if (!formatMeta) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="mx-auto max-w-3xl p-6 text-center">
          <h1 className="text-2xl font-bold">Формат не найден</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ← На главную
          </Link>
        </div>
      </main>
    )
  }

  // Mock-счётчики подкатегорий зависят от выбранного города;
  // итог формата считаем как сумму, чтобы цифры на экране сходились.
  const subcategoryCounts = new Map(
    formatMeta.subcategories.map((sub) => [
      sub.slug,
      countForCity(sub.weeklyCount, city, `${formatMeta.slug}:${sub.slug}`),
    ]),
  )
  const formatWeeklyCount = Array.from(subcategoryCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  )

  const activeSubcategory = findSubcategory(subcategory)
  const hasFilter = Boolean(subcategory || tags.length)
  // В фильтре показываем только вайбы, разрешённые в текущем формате.
  const formatTags = tagCatalog.filter((item) => isTagAllowed(item, formatMeta.slug))

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          ← На главную
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {formatMeta.label} · {city || 'все города'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatWeeklyCount} {meetingsWord(formatWeeklyCount)} на неделе
          </p>
          {formatMeta.slug === 'online' && (
            <button
              type="button"
              onClick={toggleLocalOnly}
              aria-pressed={localOnly}
              className={`mt-3 inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-sm font-medium transition ${
                localOnly
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {localOnly ? '✓ ' : ''}Только мой город
            </button>
          )}
        </div>

        {/* Подкатегории формата */}
        <section
          aria-label="Подкатегории формата"
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {formatMeta.subcategories.map((sub) => (
            <CategoryTile
              key={sub.slug}
              label={sub.label}
              emoji={sub.emoji}
              meta={`${subcategoryCounts.get(sub.slug) ?? sub.weeklyCount} ${meetingsWord(
                subcategoryCounts.get(sub.slug) ?? sub.weeklyCount,
              )}`}
              gradient={formatMeta.gradient}
              active={subcategory === sub.slug}
              onClick={() => selectSubcategory(sub.slug)}
              heightClass="h-24"
            />
          ))}
          <CategoryTile
            label="Все тематики →"
            emoji="✨"
            meta="Смотреть всё"
            gradient="from-slate-100 via-slate-50 to-white dark:from-slate-500/25 dark:via-slate-800 dark:to-slate-800"
            active={!hasFilter}
            onClick={resetFilters}
            heightClass="h-24"
          />
        </section>

        {/* Слева — вайб-фильтр, справа — список встреч */}
        <div
          className={`grid items-start gap-6 ${
            formatTags.length > 0 ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : ''
          }`}
        >
        {formatTags.length > 0 && (
          <VibeFilter tags={formatTags} value={tags} onChange={setTags} />
        )}

        <section aria-labelledby="format-events-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="format-events-title" className="text-lg font-semibold">
            {activeSubcategory ? activeSubcategory.label : 'Все встречи формата'}
          </h2>
          {!loading && !error && (
            <span className="text-sm text-gray-500">
              {events.length} {meetingsWord(events.length)}
            </span>
          )}
        </div>

        {!online ? (
          <OfflineFeed />
        ) : loading ? (
          <EventListSkeleton />
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Повторить
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-lg text-gray-600">
              В этом формате пока нет встреч в твоём городе — создай свою
            </p>
            <Link
              href={`/events/new?format=${formatMeta.slug}${
                subcategory ? `&subcategory=${subcategory}` : ''
              }`}
              className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              Создать событие
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        )}
        </section>
        </div>
      </div>
    </main>
  )
}
