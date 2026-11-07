'use client'

import { useState } from 'react'
import type { Tag } from '@/lib/tags'

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 6.5 5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m2.5 4.5 3.5 3 3.5-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Боковая панель фильтра вайбов: поиск, выбранные чипы и группы
 * с чекбоксами. Мультивыбор — события подходят по любому из вайбов.
 */
export default function VibeFilter({
  tags,
  value,
  onChange,
}: {
  tags: Tag[]
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const normalizedQuery = query.trim().toLowerCase()

  // Группы идут в порядке sortOrder, поэтому склеиваем соседние.
  const groups: { label: string; items: Tag[] }[] = []
  for (const tag of tags) {
    const label = tag.groupLabel || 'Вайбы'
    if (normalizedQuery && !tag.label.toLowerCase().includes(normalizedQuery)) continue
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.items.push(tag)
    } else {
      groups.push({ label, items: [tag] })
    }
  }

  const selectedTags = value.map((slug) => tags.find((tag) => tag.slug === slug) ?? { slug, label: slug })
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsed[group.label])

  const toggle = (slug: string) => {
    onChange(value.includes(slug) ? value.filter((item) => item !== slug) : [...value, slug])
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-gray-900">Вайб</span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Введите название"
        aria-label="Поиск вайба"
        className="mt-3 w-full rounded-xl border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400"
      />

      {selectedTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.slug}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-2.5 pr-1.5 text-xs text-gray-700"
            >
              {tag.label}
              <button
                type="button"
                onClick={() => toggle(tag.slug)}
                aria-label={`Убрать вайб «${tag.label}»`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-300 hover:text-gray-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="py-2 text-sm text-gray-500">Ничего не найдено</p>
        ) : (
          groups.map((group) => {
            const open = normalizedQuery ? true : !collapsed[group.label]
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((current) => ({ ...current, [group.label]: !current[group.label] }))
                  }
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm font-semibold text-gray-900"
                >
                  {group.label}
                  <ChevronIcon open={open} />
                </button>
                {open && (
                  <ul className="mt-0.5 space-y-0.5">
                    {group.items.map((tag) => {
                      const active = value.includes(tag.slug)
                      return (
                        <li key={tag.slug}>
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggle(tag.slug)}
                              className="peer sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 ${
                                active
                                  ? 'border-gray-900 bg-gray-900 text-white dark:border-blue-500 dark:bg-blue-500'
                                  : 'border-gray-300 bg-white text-transparent'
                              }`}
                            >
                              <CheckIcon />
                            </span>
                            {tag.label}
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>

      {groups.length > 0 && !normalizedQuery && (
        <button
          type="button"
          onClick={() => {
            const next: Record<string, boolean> = {}
            for (const group of groups) next[group.label] = !allCollapsed
            setCollapsed(next)
          }}
          className="mt-2 text-sm font-medium text-blue-600 hover:underline"
        >
          {allCollapsed ? 'Развернуть' : 'Свернуть'}
        </button>
      )}
    </div>
  )
}
