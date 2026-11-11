'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Header from '@/components/Header'
import EventImage from '@/components/EventImage'

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

/** Отдельная страница со всеми чатами пользователя. */
export default function ChatsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await api.get<{ success: boolean; chats: ChatListItem[] }>('/chats')
      setChats(data.chats ?? [])
      window.dispatchEvent(new Event('sk:chats-updated'))
    } catch {
      setError('Не удалось загрузить чаты')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?from=/chats')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    void load()
    // Обновляем список раз в 30 секунд, чтобы подтягивать новые сообщения.
    const timer = setInterval(() => void load(), 30000)
    return () => clearInterval(timer)
  }, [user, load])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </main>
    )
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
  const unread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0)

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="mx-auto max-w-3xl p-4 pb-24 sm:p-6 md:pb-6">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← На главную
        </Link>

        <div className="mb-4 mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Сообщения</h1>
            <p className="mt-1 text-sm text-gray-500">
              {unread > 0 ? `Непрочитанных: ${unread}` : 'Все чаты прочитаны'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Обновить
          </button>
        </div>

        <label className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
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

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:ring-slate-700">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">Загрузка...</p>
          ) : error ? (
            <p className="px-4 py-10 text-center text-sm text-red-600">{error}</p>
          ) : visibleChats.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {visibleChats.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/chats/${chat.id}`}
                    className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-4"
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
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              {query.trim()
                ? 'Ничего не найдено'
                : 'Пока нет чатов — они создаются для ваших событий'}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
