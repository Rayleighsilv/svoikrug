'use client'

import { useTags } from '@/lib/tags'
import { MAX_EVENT_TAGS } from '@/lib/validation'

/**
 * Облако тегов для формы события. Категории (атмосфера/формат/интересы)
 * хранятся в БД, но в UI намеренно не показываются — теги идут единым списком.
 */
export default function TagPicker({
  value,
  onChange,
  error,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  error?: string
}) {
  const { tags, loading } = useTags()

  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug))
    } else if (value.length < MAX_EVENT_TAGS) {
      onChange([...value, slug])
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="block text-sm font-medium text-gray-700">
          Вайб события <span className="text-gray-400">(необязательно)</span>
        </span>
        <span
          className={`text-xs ${
            value.length >= MAX_EVENT_TAGS ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          {value.length}/{MAX_EVENT_TAGS}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Загружаем теги...</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-gray-400">Теги пока недоступны</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = value.includes(tag.slug)
            const disabled = !active && value.length >= MAX_EVENT_TAGS
            return (
              <button
                key={tag.slug}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggle(tag.slug)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
                } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Выберите до {MAX_EVENT_TAGS} тегов — так проще найти ваше событие.
      </p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
