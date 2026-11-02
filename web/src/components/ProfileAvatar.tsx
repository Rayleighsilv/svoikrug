'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'

const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfileAvatar({
  url,
  name,
}: {
  url?: string | null
  name?: string | null
}) {
  const { refreshUser } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Закрываем меню по клику вне и по Escape.
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Сбрасываем input, чтобы можно было выбрать тот же файл повторно.
    event.target.value = ''
    if (!file) return

    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Допустимы только JPEG, PNG и WebP')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Файл слишком большой (максимум 2MB)')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await api.post('/users/me/avatar', formData)
      await refreshUser()
      setOpen(false)
    } catch (err) {
      const errObj = (err || {}) as { code?: string; message?: string }
      const map: Record<string, string> = {
        FILE_TOO_LARGE: 'Файл слишком большой (максимум 2MB)',
        INVALID_FILE_TYPE: 'Допустимы только JPEG, PNG и WebP',
      }
      setError(
        errObj.code ? map[errObj.code] || 'Не удалось загрузить фото' : 'Не удалось загрузить фото',
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await api.delete('/users/me/avatar')
      await refreshUser()
      setOpen(false)
    } catch {
      setError('Не удалось удалить фото')
    } finally {
      setDeleting(false)
    }
  }

  const busy = uploading || deleting

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <div className="relative inline-block">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !busy && setOpen((value) => !value)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Изменить фото профиля"
          className="group relative block h-24 w-24 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait"
        >
          <Avatar url={url} name={name} size="w-24 h-24" />
          <span
            className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/45 transition ${
              open || busy
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
          >
            {busy ? <Spinner /> : <CameraIcon />}
          </span>
        </button>

        {open && !busy && (
          <div
            role="menu"
            aria-label="Фото профиля"
            className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                fileInputRef.current?.click()
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              <CameraIcon className="h-4 w-4 shrink-0 text-gray-400" />
              {url ? 'Изменить фотографию' : 'Загрузить фотографию'}
            </button>
            {url && (
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
              >
                <TrashIcon />
                Удалить фото
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="mt-2 max-w-[12rem] text-xs text-red-600">{error}</p>}
    </div>
  )
}

function CameraIcon({ className = 'h-6 w-6 text-white' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-2.586l-1.707-1.707A1 1 0 0014.586 3H9.414a1 1 0 00-.707.293L7.414 5H4zm8 3a4 4 0 100 8 4 4 0 000-8z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
