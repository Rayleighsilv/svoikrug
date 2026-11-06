'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
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
          <ThemeToggle />
          {!loading &&
            (user ? (
              <>
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
