'use client'

import { useEffect, useRef, useState } from 'react'
import { useCity } from '@/contexts/CityContext'
import { useCitySuggestions } from '@/lib/useCitySuggestions'

export default function CitySelector() {
  const { city, setCity } = useCity()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { suggestions, loading } = useCitySuggestions(query, open)

  // Закрываем панель по клику вне и по Escape.
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

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const choose = (value: string | null) => {
    setCity(value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Выбрать город"
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18s6-5.1 6-10a6 6 0 10-12 0c0 4.9 6 10 6 10zm0-7a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
        <span className="max-w-[5rem] truncate sm:max-w-[11rem]" title={city || 'Все города'}>
          {city || 'Все города'}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Выбор города"
          className="fixed left-4 right-4 top-16 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-4 sm:w-72"
        >
          <div className="border-b border-gray-100 p-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти город..."
              aria-label="Найти город"
              maxLength={50}
              autoComplete="off"
              className="w-full rounded border border-gray-300 p-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => choose(null)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM2 10h16M10 2c2.2 2.3 3.3 5 3.3 8S12.2 15.7 10 18c-2.2-2.3-3.3-5-3.3-8S7.8 4.3 10 2z" />
                </svg>
                Все города
              </span>
              {city === null && <CheckIcon />}
            </button>

            {loading ? (
              <p className="px-3 py-2 text-sm text-gray-500">Поиск...</p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">Город не найден</p>
            ) : (
              suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => choose(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                >
                  <span className="truncate">{item}</span>
                  {city === item && <CheckIcon />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
