'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

type Profile = {
  nickname: string
  bio?: string | null
  avatarUrl?: string | null
  district?: string | null
  trustScore: number
  isVerified: boolean
}

type User = {
  id: string
  email: string
  status: string
  profile: Profile | null
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nickname?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Проверка сессии при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get<{ success: boolean; user: User }>('/auth/me')
        setUser(response.user)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; user: User }>('/auth/login', {
      email,
      password,
    })
    setUser(response.user)
  }

  const register = async (email: string, password: string, nickname?: string) => {
    const response = await api.post<{ success: boolean; user: User }>('/auth/register', {
      email,
      password,
      nickname,
    })
    setUser(response.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
