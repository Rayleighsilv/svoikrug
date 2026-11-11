'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCity } from '@/contexts/CityContext'
import { api } from '@/lib/api'
import Header from '@/components/Header'
import ProfileAvatar from '@/components/ProfileAvatar'
import CityInput from '@/components/CityInput'
import EventPassport from '@/components/EventPassport'
import ProfileBadges from '@/components/ProfileBadges'
import TrustScorePanel from '@/components/TrustScorePanel'
import UserTagsSection from '@/components/UserTagsSection'
import VerificationModal from '@/components/VerificationModal'
import { calculateAge, formatAge, formatBirthDate } from '@/lib/age'

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth()
  // Город в профиле — то же состояние, что и в шапке.
  const { city, setCity } = useCity()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [district, setDistrict] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [verificationOpen, setVerificationOpen] = useState(false)

  const closeVerification = useCallback(() => setVerificationOpen(false), [])

  // Middleware уже должен отсечь гостей, но подстраховываемся в UI.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?from=/profile')
    }
  }, [loading, user, router])

  // Показываем галочку «скопировано» пару секунд.
  useEffect(() => {
    if (!copiedEmail) return
    const timer = setTimeout(() => setCopiedEmail(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedEmail])

  const handleCopyEmail = async () => {
    if (!user || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(user.email)
      setCopiedEmail(true)
    } catch {
      // clipboard может быть недоступен — молча игнорируем
    }
  }

  const startEditing = () => {
    setNickname(user?.profile?.nickname || '')
    setBio(user?.profile?.bio || '')
    setDistrict(user?.profile?.district || '')
    setProfileCity(city ?? user?.profile?.city ?? '')
    setBirthDate(user?.profile?.birthDate ? user.profile.birthDate.slice(0, 10) : '')
    setSaveError('')
    setEditing(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const nick = nickname.trim()
    if (nick.length < 2 || nick.length > 30) {
      setSaveError('Никнейм должен содержать от 2 до 30 символов')
      return
    }
    if (!/^[a-zA-Zа-яА-Я0-9_-]+$/.test(nick)) {
      setSaveError('Ник может содержать только буквы, цифры, дефис и подчёркивание')
      return
    }
    const cityValue = profileCity.trim()
    if (cityValue && (cityValue.length < 2 || cityValue.length > 50)) {
      setSaveError('Город должен содержать от 2 до 50 символов')
      return
    }
    if (birthDate) {
      const parsed = new Date(`${birthDate}T00:00:00.000Z`)
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        setSaveError('Укажите корректную дату рождения')
        return
      }
    }
    setSaving(true)
    setSaveError('')
    try {
      await api.patch('/users/me/profile', {
        nickname: nick,
        bio,
        district,
        city: cityValue,
        birthDate: birthDate || '',
      })
      // Единый город: сохранили в профиле — сразу обновили шапку и ленту.
      setCity(cityValue || null)
      await refreshUser()
      setEditing(false)
    } catch (err) {
      const errObj = (err || {}) as {
        code?: string
        message?: string
        details?: Array<{ field?: string; message?: string }>
      }
      if (errObj.code === 'NICKNAME_TAKEN') {
        setSaveError('Этот ник уже занят')
      } else if (errObj.code === 'VALIDATION_ERROR' && errObj.details?.[0]?.message) {
        setSaveError(errObj.details[0].message)
      } else {
        setSaveError(errObj.message || 'Не удалось сохранить профиль')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="mx-auto max-w-3xl p-4 sm:p-6" aria-busy="true" aria-label="Загрузка профиля">
          <div className="mb-6 h-8 w-36 animate-pulse rounded bg-gray-200" />
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-56 max-w-full animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
              <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
            </div>
          </div>
          <div className="mt-8 h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    )
  }

  // После загрузки сессии пользователя нет — редиректим (см. useEffect).
  if (!user) {
    return null
  }

  const todayISO = new Date().toISOString().slice(0, 10)
  const age = calculateAge(user.profile?.birthDate)
  const birthDateLabel = formatBirthDate(user.profile?.birthDate)

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          К событиям
        </Link>

        <h1 className="mb-8 text-2xl font-bold">Профиль</h1>

        {/* Карточка профиля */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileAvatar url={user.profile?.avatarUrl} name={user.profile?.nickname} />
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">
                  {user.profile?.nickname || 'Без имени'}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <span className="truncate">{user.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    aria-label={copiedEmail ? 'Email скопирован' : 'Скопировать email'}
                    title={copiedEmail ? 'Скопировано' : 'Скопировать email'}
                    className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {copiedEmail ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                {city && (
                  <p className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      📍 {city}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="self-start rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700"
              >
                Редактировать профиль
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{saveError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-nickname">
                  Никнейм
                </label>
                <input
                  id="edit-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-bio">
                  Био
                </label>
                <textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-district">
                  Район
                </label>
                <input
                  id="edit-district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  maxLength={100}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-city">
                  Город
                </label>
                <CityInput
                  id="edit-city"
                  value={profileCity}
                  onChange={setProfileCity}
                  placeholder="Например: Москва"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="edit-birth-date"
                >
                  Дата рождения
                </label>
                <input
                  id="edit-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={todayISO}
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  В публичном профиле показывается только возраст.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <>
            <dl className="space-y-2 text-sm">
            {user.profile?.bio && (
              <div>
                <dt className="font-medium text-gray-600">Bio</dt>
                <dd className="text-gray-800 whitespace-pre-line">{user.profile.bio}</dd>
              </div>
            )}
            {user.profile?.district && (
              <div>
                <dt className="font-medium text-gray-600">Район</dt>
                <dd className="text-gray-800">{user.profile.district}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-600">Дата рождения</dt>
              <dd className="text-gray-800">
                {birthDateLabel ? (
                  <>
                    {birthDateLabel}
                    {age != null && (
                      <span className="text-gray-500"> · {formatAge(age)}</span>
                    )}
                  </>
                ) : (
                  'Не указана'
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TrustScorePanel score={user.profile?.trustScore ?? 0} />

            <section
              aria-labelledby="verification-block-title"
              className="rounded-2xl bg-gray-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3
                    id="verification-block-title"
                    className="text-sm font-medium text-gray-700"
                  >
                    Верификация
                  </h3>
                  {user.profile?.isVerified ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      ✓ Верифицирован
                    </span>
                  ) : (
                    <p className="mt-1 text-sm text-gray-800">Не верифицирован</p>
                  )}
                </div>
                {!user.profile?.isVerified && (
                  <button
                    type="button"
                    onClick={() => setVerificationOpen(true)}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Пройти верификацию
                  </button>
                )}
              </div>
              {!user.profile?.isVerified && (
                <p className="mt-3 text-xs text-gray-500">
                  Бейдж повышает доверие и открывает доступ к закрытым сборам.
                </p>
              )}
            </section>
          </div>

          <UserTagsSection userId={user.id} isOwn />
          </>
          )}
        </div>

        {/* Заглушки V1: бейджи и паспорт квартирника */}
        <div className="mt-6 space-y-4">
          <ProfileBadges />
          <EventPassport />
        </div>

      </div>

      <VerificationModal open={verificationOpen} onClose={closeVerification} />
    </main>
  )
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
      <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
