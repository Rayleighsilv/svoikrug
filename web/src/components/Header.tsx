'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import FavoritesButton from '@/components/FavoritesButton'
import ChatButton from '@/components/ChatButton'
import NotificationBell from '@/components/NotificationBell'
import UserMenu from '@/components/UserMenu'
import CitySelector from '@/components/CitySelector'
import ThemeToggle from '@/components/ThemeToggle'

export default function Header() {
  const { user, loading } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            aria-label="SvoiKrug — на главную"
            className="shrink-0 text-lg font-bold text-gray-900 sm:text-xl"
          >
            <span className="sm:hidden" aria-hidden="true">
              SK
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              SvoiKrug
            </span>
          </Link>
          <CitySelector />
        </div>

        <nav aria-label="Аккаунт и настройки" className="flex shrink-0 items-center gap-1 text-xs sm:gap-4 sm:text-sm">
          {!loading && user && (
            <Link
              href="/my-events"
              className="hidden items-center gap-1.5 whitespace-nowrap px-2 py-1.5 font-medium text-gray-700 transition hover:text-blue-600 lg:inline-flex"
            >
              <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Мои события
            </Link>
          )}
          <ThemeToggle />
          {!loading &&
            (user ? (
              <>
                <FavoritesButton />
                <ChatButton />
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Link href="/login" className="text-blue-600 hover:underline">
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="rounded bg-blue-600 px-2.5 py-1 text-white transition hover:bg-blue-700 sm:px-3"
                >
                  Регистрация
                </Link>
              </>
            ))}
        </nav>
      </div>
    </header>
  )
}
