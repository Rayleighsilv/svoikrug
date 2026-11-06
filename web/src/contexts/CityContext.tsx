'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const CITY_COOKIE = 'sk_city'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 год

type CityContextType = {
  city: string | null
  setCity: (city: string | null) => void
  ready: boolean
}

const CityContext = createContext<CityContextType | undefined>(undefined)

function readCityCookie(): { city: string | null; selected: boolean } {
  if (typeof document === 'undefined') return { city: null, selected: false }
  const match = document.cookie.match(/(?:^|;\s*)sk_city=([^;]*)/)
  if (!match) return { city: null, selected: false }
  try {
    const value = decodeURIComponent(match[1]).trim()
    return { city: value ? value.slice(0, 50) : null, selected: true }
  } catch {
    return { city: null, selected: true }
  }
}

function writeCityCookie(city: string | null) {
  if (typeof document === 'undefined') return
  // Пустое значение — осознанный выбор «Все города»: cookie остаётся,
  // чтобы город из профиля не подставлялся повторно при следующем заходе.
  document.cookie = `${CITY_COOKIE}=${encodeURIComponent(city ?? '')}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function CityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [city, setCityState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const selectedRef = useRef(false)

  useEffect(() => {
    const stored = readCityCookie()
    selectedRef.current = stored.selected
    setCityState(stored.city)
    setReady(true)
  }, [])

  // Пока город не выбран вручную, подставляем город из профиля —
  // шапка, лента и профиль показывают одно и то же значение.
  const profileCity = user?.profile?.city?.trim() || null
  useEffect(() => {
    if (!ready || selectedRef.current || !profileCity) return
    setCityState(profileCity.slice(0, 50))
  }, [ready, profileCity])

  const setCity = (next: string | null) => {
    const value = next?.trim() || null
    selectedRef.current = true
    setCityState(value)
    writeCityCookie(value)
  }

  return (
    <CityContext.Provider value={{ city, setCity, ready }}>{children}</CityContext.Provider>
  )
}

export function useCity() {
  const context = useContext(CityContext)
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider')
  }
  return context
}
