'use client'

import type { EventFormat } from '@/lib/formats'
import { isTagAllowed, useTags, type Tag } from '@/lib/tags'
import { MAX_EVENT_TAGS } from '@/lib/validation'

/**
 * Облако вайбов для формы события. Список зависит от формата события,
 * чипы сгруппированы по подкатегориям (groupLabel из справочника).
 */
export default function TagPicker({
  value,
  onChange,
  format,
  error,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  format: EventFormat
  error?: string
}) {
  const { tags, loading } = useTags()

  const available = tags.filter((tag) => isTagAllowed(tag, format))

  // Группы идут в порядке sortOrder из API, поэтому склеиваем соседние.
  const groups: { label: string; items: Tag[] }[] = []
  for (const tag of available) {
    const label = tag.groupLabel || 'Вайбы'
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.items.push(tag)
    } else {
      groups.push({ label, items: [tag] })
    }
  }

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
      ) : available.length === 0 ? (
        <p className="text-sm text-gray-400">Для этого формата пока нет вайбов</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((tag) => {
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
            </div>
          ))}
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Выберите до {MAX_EVENT_TAGS} тегов — так проще найти ваше событие.
      </p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
