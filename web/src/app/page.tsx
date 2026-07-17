// web/src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  email: string
  profile: {
    nickname: string
    trustScore: number
    isVerified: boolean
  } | null
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    fetch('http://localhost:4000/debug/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users)
        setLoading(false)
      })
      .catch(err => {
        console.error('Ошибка загрузки:', err)
        setLoading(false)
      })
  }, [])

  const [newUser, setNewUser] = useState({ email: '', nickname: '', rating: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Record<string, unknown> = {
      email: newUser.email,
      nickname: newUser.nickname || undefined,
    }
    if (newUser.rating) {
      payload.trustScore = Number(newUser.rating)
    }

    try {
      const response = await fetch('http://localhost:4000/debug/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        setNewUser({ email: '', nickname: '', rating: '' })
        setUsers(prevUsers => [...prevUsers, result.user])
        setSuccessMsg('✅ Пользователь добавлен!')
        setTimeout(() => setSuccessMsg(''), 2000)
      } else {
        alert(result.error || 'Ошибка создания пользователя')
      }
    } catch (err) {
      console.error('Ошибка создания пользователя:', err)
      alert('Не удалось создать пользователя')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Удалить этого пользователя?')) return

    try {
      const response = await fetch(`http://localhost:4000/debug/users/${userId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      alert('Не удалось удалить пользователя')
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-semibold mb-8 text-gray-600">👥 Участники SvoiKrug</h1>

      {/* Форма создания пользователя */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">➕ Добавить участника</h2>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="flex-1 p-2 border rounded text-gray-900"
            required
          />
          <input
            type="text"
            placeholder="Имя (необязательно)"
            value={newUser.nickname}
            onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
            className="flex-1 p-2 border rounded text-gray-900"
          />
          <input
            type="number"
            placeholder="Рейтинг (необязательно)"
            value={newUser.rating}
            onChange={(e) => setNewUser({ ...newUser, rating: e.target.value })}
            className="flex-1 p-2 border rounded text-gray-900"
            min="0"
            max="1000"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Создать
          </button>
        </div>
      </form>

      {/* Сообщение об успехе */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center font-medium">
          {successMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Загрузка...</p>
      ) : !users || users.length === 0 ? (
        <p className="text-gray-600">Пока нет участников</p>
      ) : (
        <ul className="space-y-3">
          {users.map(user => (
            <li key={user.id} className="p-4 bg-white rounded-lg shadow text-gray-900">
              <strong>{user.profile?.nickname || 'Без имени'}</strong>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-sm text-green-600">⭐ Рейтинг: {user.profile?.trustScore ?? 0}</div>
              <button
                onClick={() => handleDelete(user.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium transition"
              >
                🗑️ Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}