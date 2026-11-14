'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { reviewsWord } from '@/lib/reviews'
import type { UserTagColor } from '@/lib/userTags'
import UserTagChip from '@/components/UserTagChip'

export type ReviewItem = {
  id: string
  score: number
  comment?: string | null
  createdAt: string
  event: { title: string }
  tag?: { slug: string; label: string; color: UserTagColor } | null
}

export function StarRow({ score, className = 'text-base' }: { score: number; className?: string }) {
  return (
    <span className={`${className} tracking-tight`} aria-label={`Оценка ${score} из 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= score ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function formatReviewDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/ г\.$/, '')
}

export default function ReviewsModal({
  userId,
  nickname,
  onClose,
}: {
  userId: string
  nickname: string | null
  onClose: () => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [ratings, setRatings] = useState<ReviewItem[]>([])
  const [summary, setSummary] = useState({ averageScore: 0, totalCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      api.get<{ success: boolean; averageScore: number; totalCount: number }>(
        `/users/${userId}/rating-summary`,
      ),
      api.get<{ success: boolean; ratings: ReviewItem[] }>(`/users/${userId}/ratings`),
    ])
      .then(([summaryData, ratingsData]) => {
        if (cancelled) return
        setSummary({ averageScore: summaryData.averageScore, totalCount: summaryData.totalCount })
        setRatings(ratingsData.ratings || [])
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить отзывы')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, reloadKey])

  // Escape + блокировка прокрутки страницы под модалкой.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  // Распределение оценок 5→1; ширина полоски — относительно самой частой оценки.
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    for (const rating of ratings) {
      if (rating.score >= 1 && rating.score <= 5) counts[rating.score - 1] += 1
    }
    const max = Math.max(1, ...counts)
    return counts
      .map((count, index) => ({
        score: index + 1,
        count,
        width: Math.round((count / max) * 100),
      }))
      .reverse()
  }, [ratings])

  const formattedAverage =
    summary.totalCount > 0 ? summary.averageScore.toFixed(1).replace('.', ',') : '—'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="reviews-title" className="text-lg font-semibold text-gray-900">
            Отзывы{nickname ? ` о ${nickname}` : ''}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-500">Загрузка...</p>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Повторить
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Все отзывы анонимны: получатель не видит, кто их оставил.
              </p>
              <div className="flex flex-col gap-6 border-b border-gray-100 pb-6 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3 sm:w-44 sm:flex-col sm:items-start sm:gap-2">
                  <p className="text-5xl font-bold leading-none text-gray-900">{formattedAverage}</p>
                  <div>
                    <StarRow score={Math.round(summary.averageScore)} className="text-lg" />
                    <p className="mt-1 text-xs text-gray-500">
                      {summary.totalCount} {reviewsWord(summary.totalCount)}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  {distribution.map((row) => (
                    <div key={row.score} className="flex items-center gap-2 text-xs text-gray-500">
                      <StarRow score={row.score} className="w-[5.5rem] shrink-0 text-sm" />
                      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-gray-900" style={{ width: `${row.width}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {ratings.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Пока нет отзывов. Оценки появляются после проведённых сборов.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {ratings.map((rating) => (
                    <li key={rating.id} className="flex gap-3 py-4">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-500"
                        aria-hidden="true"
                      >
                        👤
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">Анонимный участник</p>
                        <p className="text-xs text-gray-500">
                          {formatReviewDate(rating.createdAt)} · Участник встречи
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StarRow score={rating.score} className="text-sm" />
                          {rating.tag && <UserTagChip tag={rating.tag} compact />}
                          <span className="text-xs text-gray-500">
                            Сбор состоялся · {rating.event.title}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="mt-1.5 whitespace-pre-line text-sm text-gray-800">{rating.comment}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
