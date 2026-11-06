'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// На экранах-флоу таб-бар скрываем: там своя нижняя панель действий.
const HIDDEN_PREFIXES = ['/login', '/register', '/events/new', '/test-']

const TABS = [
  { href: '/', label: 'Главная', icon: 'home' },
  { href: '/search', label: 'Поиск', icon: 'search' },
  { href: '/events/new', label: 'Создать', icon: 'plus' },
  { href: '/notifications', label: 'События', icon: 'calendar' },
  { href: '/profile', label: 'Профиль', icon: 'user' },
] as const

type IconName = (typeof TABS)[number]['icon']

function isActiveTab(pathname: string, href: string): boolean {
  if (href === '/') {
    // Форматы и карточка события — продолжение главной ленты.
    return (
      pathname === '/' ||
      pathname.startsWith('/format/') ||
      (pathname.startsWith('/events/') && pathname !== '/events/new')
    )
  }
  if (href === '/events/new') return pathname === '/events/new'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function TabIcon({ name }: { name: IconName }) {
  const common = {
    className: 'h-6 w-6',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
          <path d="M8 14h2M14 14h2M8 17.5h2M14 17.5h2" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20.5a7 7 0 0 1 14 0" />
        </svg>
      )
  }
}

export default function MobileTabBar() {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = isActiveTab(pathname, tab.href)
          const center = tab.icon === 'plus'

          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                {center ? (
                  <span
                    className={`-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 ${
                      active ? 'ring-4 ring-blue-100' : ''
                    }`}
                  >
                    <TabIcon name={tab.icon} />
                  </span>
                ) : (
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      active ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    <TabIcon name={tab.icon} />
                  </span>
                )}
                <span
                  className={
                    center
                      ? '-mt-1 text-blue-600'
                      : active
                        ? 'text-blue-600'
                        : 'text-gray-500'
                  }
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
