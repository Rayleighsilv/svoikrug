'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useCitySuggestions } from '@/lib/useCitySuggestions'

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
}

export default function CityInput({
  id,
  value,
  onChange,
  placeholder = 'Начните вводить город',
  hasError,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const { suggestions, loading } = useCitySuggestions(query, open)

  // Синхронизация с внешним значением (предзаполнение формы).
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Закрываем список по клику вне и по Escape.
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleChange = (next: string) => {
    setQuery(next)
    onChange(next)
    setOpen(true)
  }

  const choose = (city: string) => {
    setQuery(city)
    onChange(city)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        maxLength={50}
        autoComplete="off"
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`w-full p-2 border rounded text-gray-900 placeholder:text-gray-400 ${
          hasError ? 'border-red-500' : 'border-gray-300'
        }`}
      />

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-gray-500">Поиск...</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">Город не найден</p>
          ) : (
            <ul className="py-1">
              {suggestions.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === city}
                    onClick={() => choose(city)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
