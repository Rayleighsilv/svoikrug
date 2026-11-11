'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PublicUserTag } from '@/lib/userTags'
import UserTagChip from '@/components/UserTagChip'

export default function UserTagsSection({
  userId,
  isOwn,
}: {
  userId: string
  isOwn: boolean
}) {
  const [tags, setTags] = useState<PublicUserTag[]>([])
  const [signals, setSignals] = useState<PublicUserTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const requests: Promise<unknown>[] = [
      api
        .get<{ success: boolean; tags: PublicUserTag[] }>(`/users/${userId}/tags`)
        .then((data) => {
          if (!cancelled) setTags(data.tags || [])
        }),
    ]
    if (isOwn) {
      requests.push(
        api
          .get<{ success: boolean; tags: PublicUserTag[] }>('/users/me/signals')
          .then((data) => {
            if (!cancelled) setSignals(data.tags || [])
          }),
      )
    } else if (!cancelled) {
      setSignals([])
    }

    Promise.all(requests)
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить теги')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, isOwn])

  return (
    <section className="mt-6 rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">Теги</h2>
      <p className="mt-1 text-sm text-gray-500">
        Собираются из анонимных отзывов после встреч. Теги действуют 12 месяцев.
      </p>

      {loading ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Загрузка тегов">
          {[0, 1, 2].map((item) => (
            <span key={item} className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : tags.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          Пока нет тегов. Они появятся после встреч, где вас отметили.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <UserTagChip key={tag.slug} tag={tag} count={tag.count} />
          ))}
        </div>
      )}

      {isOwn && signals.length > 0 && (
        <div className="mt-5 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
          <h3 className="text-sm font-semibold text-red-800">Личные сигналы</h3>
          <p className="mt-1 text-xs text-red-700">
            Видны только вам. Публично появятся, если тег подтвердят минимум два
            независимых участника.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signals.map((tag) => (
              <UserTagChip key={tag.slug} tag={tag} count={tag.count} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
