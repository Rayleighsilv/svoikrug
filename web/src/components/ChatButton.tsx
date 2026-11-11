'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

/** Иконка «Сообщения» в шапке: ссылка на страницу чатов и бейдж непрочитанных. */
export default function ChatButton() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshBadge = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; count: number }>('/chats/unread-count')
      setUnread(data.count)
    } catch {
      // игнорируем — бейдж не критичен
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

  if (!user) return null

  const active = pathname.startsWith('/chats')

  return (
    <Link
      href="/chats"
      aria-current={active ? 'page' : undefined}
      aria-label={unread > 0 ? `Сообщения, непрочитанных: ${unread}` : 'Сообщения'}
      title="Сообщения"
      className={`relative rounded-full p-2 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        active ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-blue-600'
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
    </Link>
  )
}
