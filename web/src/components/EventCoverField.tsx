'use client'

import { useEffect, useMemo, useState } from 'react'
import { resolveMediaUrl } from '@/lib/avatar'
import EventImage from '@/components/EventImage'

const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Обложка события: превью выбранного файла, текущее фото или подсказка.
 * Владелец состояния — родительская форма (create/edit).
 */
export default function EventCoverField({
  currentUrl,
  file,
  removed,
  onFileChange,
  onRemove,
  fallback,
}: {
  currentUrl?: string | null
  file: File | null
  removed: boolean
  onFileChange: (file: File | null) => void
  onRemove: () => void
  fallback?: { emoji: string; gradient: string }
}) {
  const [localError, setLocalError] = useState('')

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file)
    if (removed) return null
    return resolveMediaUrl(currentUrl)
  }, [file, currentUrl, removed])

  // Освобождаем blob-URL при замене файла и размонтировании.
  useEffect(() => {
    if (!previewUrl || !previewUrl.startsWith('blob:')) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    e.target.value = ''
    setLocalError('')

    if (!selected) return
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setLocalError('Подойдёт JPEG, PNG или WebP')
      return
    }
    if (selected.size > MAX_SIZE) {
      setLocalError('Файл больше 2 МБ')
      return
    }
    onFileChange(selected)
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        Фото места <span className="text-gray-400">(необязательно)</span>
      </span>

      {previewUrl ? (
        <EventImage
          src={previewUrl}
          alt="Обложка события"
          fallback={fallback}
          className="h-48 w-full rounded-xl"
        />
      ) : (
        <div className="flex h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
          <span className="text-3xl" aria-hidden="true">
            🏠
          </span>
          <span className="mt-2 text-sm">Добавьте фото, чтобы событие заметили</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
          {previewUrl ? 'Заменить фото' : 'Выбрать фото'}
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleSelect}
            className="sr-only"
          />
        </label>
        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              setLocalError('')
              onRemove()
            }}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Удалить фото
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500">JPEG, PNG или WebP до 2 МБ.</p>
      {localError && <p className="mt-1 text-sm text-red-600">{localError}</p>}
    </div>
  )
}
