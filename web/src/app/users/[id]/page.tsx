'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

type Profile = {
  id: string
  nickname: string | null
  bio?: string | null
  avatarUrl?: string | null
  district?: string | null
  trustScore: number
  isVerified: boolean
}

type PublicUser = {
  id: string
  nickname: string | null
  avatarUrl: string | null
  trustScore: number
}

const FOLLOW_ERRORS: Record<string, string> = {
  ALREADY_FOLLOWING: 'Вы уже подписаны на этого пользователя.',
  CANNOT_FOLLOW_SELF: 'Нельзя подписаться на себя.',
  NOT_FOLLOWING: 'Вы не подписаны на этого пользователя.',
}

function Avatar({ url, name, size = 'w-10 h-10' }: { url?: string | null; name?: string | null; size?: string }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name || 'Аватар'} className={`${size} rounded-full object-cover`} />
  }
  return (
    <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center font-bold text-white`}>
      {initial}
    </div>
  )
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const id = params.id

  const [profile, setProfile] = useState<Profile | null>(null)
  const [followers, setFollowers] = useState<PublicUser[]>([])
  const [following, setFollowing] = useState<PublicUser[]>([])
  const [followingStatus, setFollowingStatus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followSubmitting, setFollowSubmitting] = useState(false)
  const [followError, setFollowError] = useState('')

  const isOwnProfile = !!(user && user.id === id)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<{ success: boolean; user: Profile }>(`/users/${id}`),
      api.get<{ success: boolean; users: PublicUser[] }>(`/users/${id}/followers`),
      api.get<{ success: boolean; users: PublicUser[] }>(`/users/${id}/following`),
    ])
      .then(([p, fol, foll]) => {
        if (cancelled) return
        setProfile(p.user)
        setFollowers(fol.users || [])
        setFollowing(foll.users || [])
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Статус подписки — только для авторизованных; гостю отдаём false (и не дёргаем API).
  useEffect(() => {
    if (loading || notFound) return
    if (!user) {
      setFollowingStatus(false)
      return
    }
    let cancelled = false
    api
      .get<{ success: boolean; following: boolean }>(`/users/${id}/follow-status`)
      .then((d) => {
        if (!cancelled) setFollowingStatus(d.following)
      })
      .catch(() => {
        if (!cancelled) setFollowingStatus(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, loading, notFound, user])

  const refetchLists = async () => {
    const [fol, foll] = await Promise.all([
      api.get<{ success: boolean; users: PublicUser[] }>(`/users/${id}/followers`),
      api.get<{ success: boolean; users: PublicUser[] }>(`/users/${id}/following`),
    ])
    setFollowers(fol.users || [])
    setFollowing(foll.users || [])
  }

  const handleFollow = async () => {
    if (!user) {
      router.replace(`/login?from=/users/${id}`)
      return
    }
    setFollowSubmitting(true)
    setFollowError('')
    try {
      if (followingStatus) {
        await api.delete(`/users/${id}/follow`)
        setFollowingStatus(false)
      } else {
        await api.post(`/users/${id}/follow`)
        setFollowingStatus(true)
      }
      await refetchLists()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      setFollowError(e.code ? (FOLLOW_ERRORS[e.code] || 'Не удалось обновить подписку') : 'Не удалось обновить подписку')
    } finally {
      setFollowSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <p className="text-gray-500">Загрузка...</p>
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Пользователь не найден</h1>
          <button onClick={() => router.replace('/')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            На главную
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
          ← Назад
        </button>

        <div className="bg-white p-6 rounded-lg shadow flex items-start gap-5">
          <Avatar url={profile.avatarUrl} name={profile.nickname} size="w-20 h-20" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.nickname || 'Без имени'}</h1>
            {profile.bio && <p className="text-gray-700 mt-1">{profile.bio}</p>}
            {profile.district && <p className="text-sm text-gray-500 mt-1">Район: {profile.district}</p>}
            <p className="text-sm text-gray-500 mt-1">Trust Score: {profile.trustScore}</p>
            <p className="text-sm text-gray-500 mt-1">{profile.isVerified ? 'Верифицирован' : 'Не верифицирован'}</p>
          </div>

          <div className="shrink-0">
            {isOwnProfile ? (
              <Link
                href="/profile"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Мой профиль
              </Link>
            ) : user ? (
              followingStatus ? (
                <button
                  onClick={handleFollow}
                  disabled={followSubmitting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-60"
                >
                  {followSubmitting ? 'Отписываемся...' : 'Отписаться'}
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  disabled={followSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {followSubmitting ? 'Подписываемся...' : 'Подписаться'}
                </button>
              )
            ) : (
              <button
                onClick={() => router.replace(`/login?from=/users/${id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Подписаться
              </button>
            )}
          </div>
        </div>

        {followError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded">{followError}</div>
        )}

        <div className="mt-6 flex gap-10">
          <p className="text-gray-700">
            <strong className="text-lg">{followers.length}</strong> подписчиков
          </p>
          <p className="text-gray-700">
            <strong className="text-lg">{following.length}</strong> подписок
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Подписчики</h2>
          {followers.length === 0 ? (
            <p className="text-gray-600">Пока нет подписчиков</p>
          ) : (
            <ul className="space-y-2">
              {followers.map((u) => (
                <li key={u.id}>
                  <Link href={`/users/${u.id}`} className="flex items-center gap-3 p-2 bg-white rounded shadow hover:shadow-md transition">
                    <Avatar url={u.avatarUrl} name={u.nickname} />
                    <span className="font-medium">{u.nickname || 'Без имени'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Подписки</h2>
          {following.length === 0 ? (
            <p className="text-gray-600">Пока нет подписок</p>
          ) : (
            <ul className="space-y-2">
              {following.map((u) => (
                <li key={u.id}>
                  <Link href={`/users/${u.id}`} className="flex items-center gap-3 p-2 bg-white rounded shadow hover:shadow-md transition">
                    <Avatar url={u.avatarUrl} name={u.nickname} />
                    <span className="font-medium">{u.nickname || 'Без имени'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
