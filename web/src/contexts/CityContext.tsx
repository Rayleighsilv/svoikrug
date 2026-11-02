'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const CITY_COOKIE = 'sk_city'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 год

type CityContextType = {
  city: string | null
  setCity: (city: string | null) => void
  ready: boolean
}

const CityContext = createContext<CityContextType | undefined>(undefined)

function readCityCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)sk_city=([^;]*)/)
  if (!match) return null
  try {
    const value = decodeURIComponent(match[1]).trim()
    return value ? value.slice(0, 50) : null
  } catch {
    return null
  }
}

function writeCityCookie(city: string | null) {
  if (typeof document === 'undefined') return
  if (city) {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(city)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  } else {
    document.cookie = `${CITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCityState(readCityCookie())
    setReady(true)
  }, [])

  const setCity = (next: string | null) => {
    const value = next?.trim() || null
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
