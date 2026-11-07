'use client'

import { useEffect, useState } from 'react'
import { api } from './api'
import type { EventFormat } from './formats'

export type TagCategory = 'atmosphere' | 'format' | 'interest'

export type Tag = {
  slug: string
  label: string
  category: TagCategory
  sortOrder: number
  groupLabel: string | null
  allowedFormats: EventFormat[]
}

// Вайб доступен в формате, если формат есть в allowedFormats.
// Пустое/отсутствующее поле (старый API) трактуем как «во всех форматах».
export function isTagAllowed(tag: Tag, format: EventFormat): boolean {
  return !tag.allowedFormats?.length || tag.allowedFormats.includes(format)
}

// Справочник тегов статичен в рамках сессии — кэшируем на уровне модуля,
// чтобы не запрашивать /tags из каждой формы и фильтра.
let cachedTags: Tag[] | null = null
let pendingRequest: Promise<Tag[]> | null = null

function loadTags(): Promise<Tag[]> {
  if (cachedTags) return Promise.resolve(cachedTags)
  if (!pendingRequest) {
    pendingRequest = api
      .get<{ success: boolean; tags: Tag[] }>('/tags')
      .then((data) => {
        cachedTags = data.tags || []
        return cachedTags
      })
      .finally(() => {
        pendingRequest = null
      })
  }
  return pendingRequest
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>(cachedTags ?? [])
  const [loading, setLoading] = useState(!cachedTags)

  useEffect(() => {
    if (cachedTags) return
    let cancelled = false
    loadTags()
      .then((data) => {
        if (!cancelled) {
          setTags(data)
          setLoading(false)
        }
      })
      .catch(() => {
        // Без справочника формы останутся без тегов — не блокируем создание.
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { tags, loading }
}
