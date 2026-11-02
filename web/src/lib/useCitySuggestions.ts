'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Дебаунс-подсказки городов. Запрос выполняется только когда enabled=true.
 * Пустой query возвращает базовый список крупных городов с бэкенда.
 */
export function useCitySuggestions(query: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const data = await api.get<{ cities: string[] }>(
          `/cities/suggest?q=${encodeURIComponent(query.trim())}`,
        )
        if (!cancelled) setSuggestions(data.cities || [])
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, enabled])

  return { suggestions, loading }
}
