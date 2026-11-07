'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import EventImage from '@/components/EventImage'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type ChatListItem = {
  id: string
  eventId: string | null
  title: string
  coverImageUrl: string | null
  startsAt: string
  expiresAt: string
  isHost: boolean
  memberCount: number
  unreadCount: number
  lastMessage: {
    text: string
    createdAt: string
    senderId: string
    senderName: string
  } | null
}

// Короткая метка времени для списка: сегодня — часы, иначе «31 окт.».
function shortTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Иконка «Сообщения» в шапке: бейдж непрочитанных и окно со списком чатов. */
export default function ChatButton() {
  const pathname = usePathname()
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const refreshBadge = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; count: number }>('/chats/unread-count')
      setUnread(data.count)
    } catch {
      // игнорируем — бейдж не критичен
    }
  }, [])

  const loadChats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<{ success: boolean; chats: ChatListItem[] }>('/chats')
      const list = data.chats ?? []
      setChats(list)
      setUnread(list.reduce((sum, chat) => sum + chat.unreadCount, 0))
    } catch {
      setError('Не удалось загрузить чаты')
    } finally {
      setLoading(false)
    }
  }, [])

  // Бейдж обновляем раз в 30 секунд и после действий в чате.
  useEffect(() => {
    if (!user) return
    void refreshBadge()
    const timer = setInterval(refreshBadge, 30000)
    const handler = () => void refreshBadge()
    window.addEventListener('sk:chats-updated', handler)
    return () => {
      clearInterval(timer)
      window.removeEventListener('sk:chats-updated', handler)
    }
  }, [user, refreshBadge])

  // Закрываем при переходе на другую страницу.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

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

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      void loadChats()
    } else {
      setQuery('')
    }
  }

  if (!user) return null

  const normalizedQuery = query.trim().toLowerCase()
  const visibleChats = normalizedQuery
    ? chats.filter((chat) => {
        const haystack = [
          chat.title,
          chat.lastMessage?.text ?? '',
          chat.lastMessage?.senderName ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : chats

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Сообщения, непрочитанных: ${unread}` : 'Сообщения'}
        title="Сообщения"
        className={`relative rounded-full p-2 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          open ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-blue-600'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Сообщения"
          className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-base font-bold text-gray-900">Сообщения</h2>
            {unread > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                {unread}
              </span>
            )}
          </div>

          <div className="border-b border-gray-100 px-3 py-2">
            <label className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по сообщениям"
                aria-label="Поиск по сообщениям"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </label>
          </div>

          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Загрузка...</p>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>
          ) : visibleChats.length > 0 ? (
            <ul className="max-h-[26rem] divide-y divide-gray-100 overflow-y-auto">
              {visibleChats.map((chat) => (
                <li key={chat.id} className="relative">
                  <Link
                    href={`/chats/${chat.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  >
                    <EventImage
                      src={chat.coverImageUrl}
                      alt={`Событие: ${chat.title}`}
                      fallback={{
                        emoji: '💬',
                        gradient:
                          'from-sky-100 via-blue-50 to-white dark:from-sky-500/25 dark:via-slate-800 dark:to-slate-800',
                      }}
                      className="h-12 w-12 shrink-0 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                          {chat.title}
                          {chat.isHost && (
                            <span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500">
                              хост
                            </span>
                          )}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {shortTime(chat.lastMessage?.createdAt ?? chat.startsAt)}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-xs text-gray-500">
                        {chat.lastMessage
                          ? `${chat.lastMessage.senderName}: ${chat.lastMessage.text}`
                          : 'Чат события — напишите первым'}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              {query.trim()
                ? 'Ничего не найдено'
                : 'Пока нет чатов — они создаются для ваших событий'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
