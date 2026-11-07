'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/date'
import Header from '@/components/Header'
import Avatar from '@/components/Avatar'
import EventImage from '@/components/EventImage'

type ChatMessage = {
  id: string
  text: string
  createdAt: string
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
}

type ChatDetail = {
  id: string
  eventId: string | null
  title: string
  coverImageUrl: string | null
  startsAt: string
  expiresAt: string
  isHost: boolean
  memberCount: number
  event: { id: string; status: string } | null
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const id = params.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [chat, setChat] = useState<ChatDetail | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const listRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await api.get<{
          success: boolean
          chat: ChatDetail
          messages: ChatMessage[]
        }>(`/chats/${id}`)
        setChat(data.chat)
        setMessages(data.messages ?? [])
        setError('')
        // Открытие чата помечает сообщения прочитанными — обновляем бейдж в шапке.
        if (!silent) window.dispatchEvent(new Event('sk:chats-updated'))
      } catch {
        if (!silent) setError('Чат не найден или уже удалён')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?from=/chats/${id}`)
    }
  }, [authLoading, user, router, id])

  useEffect(() => {
    if (!user) return
    void load()
    // Простой polling: новые сообщения подтягиваются раз в 5 секунд.
    const timer = setInterval(() => void load(true), 5000)
    return () => clearInterval(timer)
  }, [user, load])

  // Прокручиваем вниз, когда пришло новое сообщение.
  useEffect(() => {
    if (messages.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending) return

    setSending(true)
    setSendError('')
    try {
      await api.post(`/chats/${id}/messages`, { text: body })
      setText('')
      await load(true)
      window.dispatchEvent(new Event('sk:chats-updated'))
    } catch {
      setSendError('Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

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

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col p-3 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Назад
          </button>
          {chat?.event && (
            <Link
              href={`/events/${chat.event.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              К событию →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <p className="text-gray-500">Загрузка чата...</p>
          </div>
        ) : error || !chat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-4xl" aria-hidden="true">
              💬
            </p>
            <p className="text-sm text-gray-500">{error || 'Чат не найден'}</p>
            <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
              На главную
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <EventImage
                src={chat.coverImageUrl}
                alt={`Событие: ${chat.title}`}
                fallback={{
                  emoji: '💬',
                  gradient:
                    'from-sky-100 via-blue-50 to-white dark:from-sky-500/25 dark:via-slate-800 dark:to-slate-800',
                }}
                className="h-11 w-11 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <h1 className="line-clamp-1 text-base font-bold text-gray-900">
                  {chat.title}
                  {chat.isHost && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      вы хост
                    </span>
                  )}
                </h1>
                <p className="text-xs text-gray-500">
                  {formatDateTime(chat.startsAt)} · участников: {chat.memberCount}
                </p>
                <p className="text-[11px] text-gray-400">
                  {chat.event ? 'Чат удалится' : 'Событие отменено, чат удалится'}{' '}
                  {formatDateTime(chat.expiresAt)}
                </p>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4 sm:px-4"
              style={{ minHeight: '16rem', maxHeight: 'calc(100vh - 22rem)' }}
            >
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Пока нет сообщений — напишите первым
                </p>
              ) : (
                messages.map((message) => {
                  const own = message.senderId === user.id
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${own ? 'justify-end' : 'justify-start'}`}
                    >
                      {!own && (
                        <Avatar
                          url={message.senderAvatarUrl}
                          name={message.senderName}
                          size="h-8 w-8"
                        />
                      )}
                      <div className={`max-w-[80%] ${own ? 'text-right' : ''}`}>
                        {!own && (
                          <p className="mb-1 text-[11px] font-medium text-gray-500">
                            {message.senderName}
                          </p>
                        )}
                        <div
                          className={`inline-block rounded-2xl px-3 py-2 text-left text-sm ${
                            own
                              ? 'rounded-br-sm bg-blue-600 text-white'
                              : 'rounded-bl-sm bg-white text-gray-900 shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 border-t border-gray-100 px-3 py-3"
            >
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                placeholder="Написать сообщение..."
                aria-label="Написать сообщение"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? '...' : 'Отправить'}
              </button>
            </form>
            {sendError && <p className="px-4 pb-2 text-xs text-red-600">{sendError}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
