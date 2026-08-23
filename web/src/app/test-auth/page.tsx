'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function TestAuthPage() {
  const { user, loading, login, register, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      setEmail('')
      setPassword('')
    } catch (err) {
      setError((err as { message?: string }).message || 'Login failed')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register(email, password, nickname || undefined)
      setEmail('')
      setPassword('')
      setNickname('')
    } catch (err) {
      setError((err as { message?: string }).message || 'Registration failed')
    }
  }

  if (loading) {
    return <div className="p-8">Загрузка...</div>
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-semibold mb-6">🔐 Test Auth Context</h1>

      {user ? (
        <div className="mb-6 p-4 bg-green-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Вы авторизованы:</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Nickname:</strong> {user.profile?.nickname || 'Не указан'}</p>
          <p><strong>Trust Score:</strong> {user.profile?.trustScore ?? 0}</p>
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-100 rounded">
          <p>Вы не авторизованы</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="mb-4 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Login
        </button>
      </form>

      <form onSubmit={handleRegister} className="mb-4 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Register</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Nickname (опционально)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
          Register
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-100 text-red-900 rounded">
          <strong>Ошибка:</strong> {error}
        </div>
      )}
    </main>
  )
}
