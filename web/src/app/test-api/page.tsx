'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

type ApiError = { status: number; code?: string; message: string }

export default function TestApiPage() {
  const [healthResult, setHealthResult] = useState<unknown>(null)
  const [eventsResult, setEventsResult] = useState<unknown>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const testHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/health')
      setHealthResult(data)
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }

  const testEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/events')
      setEventsResult(data)
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-semibold mb-6">🧪 API Test Page</h1>

      <div className="flex gap-3 mb-6">
        <button
          onClick={testHealth}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          GET /health
        </button>
        <button
          onClick={testEvents}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          GET /events
        </button>
      </div>

      {loading && <p className="mb-4 text-gray-600">Загрузка...</p>}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-900 rounded">
          <strong>Ошибка:</strong> {error.status} — {error.message}
          {error.code && <span> (код: {error.code})</span>}
        </div>
      )}

      {healthResult !== null && (
        <div className="mb-4 p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-2">/health:</h2>
          <pre className="text-sm text-gray-800 overflow-auto">
            {JSON.stringify(healthResult, null, 2)}
          </pre>
        </div>
      )}

      {eventsResult !== null && (
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-2">/events:</h2>
          <pre className="text-sm text-gray-800 overflow-auto">
            {JSON.stringify(eventsResult, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}
