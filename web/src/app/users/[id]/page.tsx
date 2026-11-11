'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import Avatar from '@/components/Avatar'
import Header from '@/components/Header'
import ReviewsModal, { StarRow } from '@/components/ReviewsModal'
import UserTagsSection from '@/components/UserTagsSection'
import { formatAge } from '@/lib/age'
import { reviewsWord } from '@/lib/reviews'

type Profile = {
  id: string
  createdAt: string
  hostedCount: number
  attendedCount: number
  nickname: string | null
  bio?: string | null
  avatarUrl?: string | null
  district?: string | null
  city?: string | null
  age?: number | null
  trustScore: number
  isVerified: boolean
}

type PublicUser = {
  id: string
  nickname: string | null
  avatarUrl: string | null
  trustScore: number
}

function formatRegistrationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/ г\.$/, '')
}

const FOLLOW_ERRORS: Record<string, string> = {
  ALREADY_FOLLOWING: 'Вы уже подписаны на этого пользователя.',
  CANNOT_FOLLOW_SELF: 'Нельзя подписаться на себя.',
  NOT_FOLLOWING: 'Вы не подписаны на этого пользователя.',
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
  const [ratingSummary, setRatingSummary] = useState<{ averageScore: number; totalCount: number }>({
    averageScore: 0,
    totalCount: 0,
  })
  const [reviewsOpen, setReviewsOpen] = useState(false)

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

  // Сводка рейтинга для карточки профиля (список отзывов грузит модалка).
  useEffect(() => {
    let cancelled = false
    api
      .get<{ success: boolean; averageScore: number; totalCount: number }>(`/users/${id}/rating-summary`)
      .then((d) => {
        if (!cancelled) setRatingSummary({ averageScore: d.averageScore, totalCount: d.totalCount })
      })
      .catch(() => {})
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
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Пользователь не найден</h1>
            <button onClick={() => router.replace('/')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              На главную
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
          ← Назад
        </button>

        <div className="bg-white p-6 rounded-lg shadow flex items-start gap-5">
          <Avatar url={profile.avatarUrl} name={profile.nickname} size="w-20 h-20" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.nickname || 'Без имени'}</h1>
            {profile.bio && <p className="text-gray-700 mt-1">{profile.bio}</p>}
            {profile.age != null && (
              <p className="text-sm text-gray-500 mt-1">Возраст: {formatAge(profile.age)}</p>
            )}
            {profile.district && <p className="text-sm text-gray-500 mt-1">Район: {profile.district}</p>}
            {profile.city && (
              <p className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  📍 {profile.city}
                </span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">На сайте с {formatRegistrationDate(profile.createdAt)}</p>
            <p className="text-sm text-gray-500 mt-1">{profile.isVerified ? 'Верифицирован' : 'Не верифицирован'}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
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
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {followSubmitting ? 'Подписываемся...' : 'Подписаться'}
                </button>
              )
            ) : (
              <button
                onClick={() => router.replace(`/login?from=/users/${id}`)}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Подписаться
              </button>
            )}

            <button
              type="button"
              onClick={() => setReviewsOpen(true)}
              title="Показать отзывы"
              className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600"
            >
              <StarRow score={Math.round(ratingSummary.averageScore)} className="text-sm" />
              <span>
                <strong>
                  {ratingSummary.totalCount > 0
                    ? ratingSummary.averageScore.toFixed(1).replace('.', ',')
                    : '—'}
                </strong>{' '}
                · {ratingSummary.totalCount} {reviewsWord(ratingSummary.totalCount)}
              </span>
            </button>
          </div>
        </div>

        {followError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded">{followError}</div>
        )}

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-2">
          <p className="text-gray-700">
            <strong className="text-lg">{followers.length}</strong> подписчиков
          </p>
          <p className="text-gray-700">
            <strong className="text-lg">{following.length}</strong> подписок
          </p>
          <p className="text-gray-700">
            <strong className="text-lg">{profile.attendedCount}</strong> посещённых сборов
          </p>
          <p className="text-gray-700">
            <strong className="text-lg">{profile.hostedCount}</strong> проведённых сборов
          </p>
        </div>

        <UserTagsSection userId={id} isOwn={isOwnProfile} />

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

      {reviewsOpen && (
        <ReviewsModal
          userId={profile.id}
          nickname={profile.nickname}
          onClose={() => setReviewsOpen(false)}
        />
      )}
    </main>
  )
}
