// web/src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  email: string
  name: string | null
  rating: number
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')




  useEffect(() => {
    // Запрашиваем пользователей с нашего бэкенда
    fetch('http://localhost:3001/debug/users')
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

  // 🔹 Новое состояние для формы
  const [newUser, setNewUser] = useState({ email: '', name: '', rating: '' })

  // 🔹 Функция отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 🔹 Подготавливаем данные: если рейтинг пустой — не отправляем его вообще
    const payload = {
      email: newUser.email,
      name: newUser.name || undefined,
      rating: newUser.rating ? Number(newUser.rating) : undefined,
    }

    try {
      const response = await fetch('http://localhost:3001/debug/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      const result = await response.json()

      if (result.success) {
        // 1. Очищаем форму
        setNewUser({ email: '', name: '', rating: '' })

        // 2. Добавляем нового пользователя прямо в список (без перезагрузки!)
        setUsers(prevUsers => [...prevUsers, result.user])

        // 🔹 Показываем сообщение на 2 секунды
        setSuccessMsg('✅ Пользователь добавлен!')
        setTimeout(() => setSuccessMsg(''), 2000)

      }


    } catch (err) {
      console.error('Ошибка создания пользователя:', err)
      alert('Не удалось создать пользователя')
    }
  }


  // 🔹 Функция удаления пользователя
  const handleDelete = async (userId: string) => {
    if (!confirm('Удалить этого пользователя?')) return

    try {
      const response = await fetch(`http://localhost:3001/debug/users/${userId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        // 🔹 Удаляем из списка без перезагрузки
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

      {/* 🔹 Форма создания пользователя */}
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
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
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

      {/* 🔹 Сообщение об успехе */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center font-medium">
          {successMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Загрузка...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-600">Пока нет участников</p>
      ) : (
        <ul className="space-y-3">
          {users.map(user => (
            <li key={user.id} className="p-4 bg-white rounded-lg shadow text-gray-900">
              <strong>{user.name || 'Без имени'}</strong>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-sm text-green-600">⭐ Рейтинг: {user.rating}</div>

              {/* 🔹 Кнопка удаления */}
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