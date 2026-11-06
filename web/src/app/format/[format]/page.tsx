'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import {
  FORMAT_BY_SLUG,
  POPULAR_LINKS,
  countForCity,
  findSubcategory,
  isEventFormat,
  type PopularItem,
} from '@/lib/formats'
import { meetingsWord } from '@/lib/reviews'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import CategoryTile from '@/components/CategoryTile'
import EventCard, { type EventCardEvent } from '@/components/EventCard'
import EventListSkeleton from '@/components/EventListSkeleton'
import Header from '@/components/Header'
import OfflineFeed from '@/components/OfflineFeed'

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

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [subcategory, setSubcategory] = useState('')
  const [district, setDistrict] = useState('')
  const [popularSearch, setPopularSearch] = useState('')

  // При смене формата сбрасываем фильтры предыдущего экрана.
  useEffect(() => {
    setSubcategory('')
    setDistrict('')
    setPopularSearch('')
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
    if (subcategory) query.set('subcategory', subcategory)
    if (district) query.set('district', district)
    if (popularSearch) query.set('search', popularSearch)

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
  }, [formatSlug, city, cityReady, online, subcategory, district, popularSearch, reloadKey])

  const applyPopular = (item: PopularItem) => {
    setSubcategory(item.subcategory ?? '')
    setDistrict(item.district ?? '')
    setPopularSearch(item.search ?? '')
  }

  const selectSubcategory = (slug: string) => {
    setDistrict('')
    setPopularSearch('')
    setSubcategory((current) => (current === slug ? '' : slug))
  }

  const resetFilters = () => {
    setSubcategory('')
    setDistrict('')
    setPopularSearch('')
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
  const hasFilter = Boolean(subcategory || district || popularSearch)

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
        </div>

        {/* Подкатегории формата */}
        <section
          aria-label="Подкатегории формата"
          className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
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

        {/* Активный чип-фильтр */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            aria-pressed={!hasFilter}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              !hasFilter
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
            }`}
          >
            Все
          </button>
          {formatMeta.subcategories.map((sub) => {
            const active = subcategory === sub.slug
            return (
              <button
                key={sub.slug}
                type="button"
                onClick={() => selectSubcategory(sub.slug)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                }`}
              >
                {sub.label}
              </button>
            )
          })}
        </div>

        {/* Популярно на неделе */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700">
          <h2 className="mb-3 text-lg font-semibold">Популярно на неделе</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {POPULAR_LINKS[formatMeta.slug].map((column) => (
              <div key={column.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {column.title}
                </h3>
                <ul className="space-y-1.5">
                  {column.items.map((item) => (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => applyPopular(item)}
                        className="flex w-full items-baseline justify-between gap-2 text-left text-sm text-gray-700 transition hover:text-blue-600"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 text-xs text-gray-400">{item.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {(district || popularSearch) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">Фильтр:</span>
            {district && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                {district}
              </span>
            )}
            {popularSearch && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                «{popularSearch}»
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-blue-600 hover:underline"
            >
              Сбросить
            </button>
          </div>
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
    </main>
  )
}
