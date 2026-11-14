'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import {
  isEventSaved,
  recordEventView,
  subscribeToEventHistory,
  toggleSavedEvent,
  type StoredEvent,
} from '@/lib/eventHistory'
import {
  formatDateTime,
  formatEventDateTime,
  formatTimeInZone,
  timeZoneForCity,
} from '@/lib/date'
import {
  PLATFORM_ICONS,
  PLATFORM_OPTIONS,
  SPORT_LEVEL_OPTIONS,
  VENUE_TYPE_OPTIONS,
  durationLabel,
  optionLabel,
} from '@/lib/eventLabels'
import { FORMAT_BY_SLUG, findSubcategory, type EventFormat } from '@/lib/formats'
import { reviewsWord } from '@/lib/reviews'
import {
  USER_TAG_COLOR_LABELS,
  userTagsForAudience,
  type PublicUserTag,
  type UserTagColor,
} from '@/lib/userTags'
import Avatar from '@/components/Avatar'
import UserTagChip from '@/components/UserTagChip'
import EventImage from '@/components/EventImage'
import Header from '@/components/Header'
import RsvpQuestionModal from '@/components/RsvpQuestionModal'
import Toast from '@/components/Toast'

type EventDetail = {
  id: string
  hostId: string
  title: string
  description?: string | null
  theme?: string | null
  format?: EventFormat | null
  subcategory?: string | null
  city?: string | null
  addressPublic?: string | null
  coverImageUrl?: string | null
  tags?: { slug: string; label: string }[]
  canViewPrivateAddress?: boolean
  hasPrivateAddress?: boolean
  startsAt: string
  endsAt?: string | null
  maxGuests?: number | null
  durationMinutes?: number | null
  waitlistEnabled?: boolean
  plusOneEnabled?: boolean
  houseRules?: string | null
  houseRulesChips?: string[] | null
  applicationQuestion?: string | null
  sportLevel?: 'beginner' | 'amateur' | 'pro' | null
  weatherDependent?: boolean
  budgetType?: 'free' | 'split'
  budgetAmount?: number | null
  budgetNote?: string | null
  venueType?: string | null
  platform?: string | null
  participantGeo?: 'any' | 'city' | null
  meetingLink?: string | null
  hasMeetingLink?: boolean
  status: string
  rules?: unknown
  lat?: number | null
  lng?: number | null
  host: {
    id: string
    email: string
    profile?: {
      nickname?: string | null
      avatarUrl?: string | null
      bio?: string | null
      district?: string | null
      trustScore: number
      isVerified: boolean
    } | null
    _count?: { ratingsReceived: number }
    tags?: PublicUserTag[]
  }
  reviewWindow?: { opensAt: string; closesAt: string; isOpen: boolean }
  _count: { guests: number }
}

function toStoredEvent(event: EventDetail): StoredEvent {
  return {
    id: event.id,
    title: event.title,
    coverImageUrl: event.coverImageUrl,
    theme: event.theme,
    subcategory: event.subcategory,
    format: event.format,
    city: event.city,
    startsAt: event.startsAt,
    hostName: event.host.profile?.nickname ?? null,
  }
}

type GuestItem = {
  id: string
  userId: string
  status: string
  applicationAnswer?: string | null
  user: {
    id: string
    profile?: {
      nickname?: string | null
      avatarUrl?: string | null
      trustScore?: number
    } | null
  }
}

type RateTarget = {
  key: string
  userId: string
  nickname: string
  avatarUrl?: string | null
  isHost: boolean
}

type ChatMessage = {
  id: string
  author: string
  text: string
  own: boolean
}

const GUEST_CHECKLIST = [
  'Проверить точный адрес',
  'Подтвердить время',
  'Взять что-то к столу',
  'Сообщить, если опаздываете',
]

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'welcome',
    author: 'Организатор',
    text: 'Добро пожаловать! Точный адрес уже в карточке события.',
    own: false,
  },
  {
    id: 'guest-hello',
    author: 'Гость',
    text: 'Спасибо, буду к началу!',
    own: false,
  },
]

function toCalendarDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

const RSVP_ERRORS: Record<string, string> = {
  ALREADY_JOINED: 'Вы уже записаны на это событие.',
  EVENT_FULL: 'Свободных мест больше нет.',
  EVENT_NOT_PUBLISHED: 'Событие ещё не открыто для записи.',
  CANNOT_JOIN_OWN_EVENT: 'Нельзя записаться на своё событие.',
  NOT_A_GUEST: 'Вы не записаны на это событие.',
}
const DEFAULT_RSVP_ERROR = 'Не удалось обработать запись. Попробуйте ещё раз.'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Открыт для записи', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Запись закрыта', className: 'bg-gray-200 text-gray-700' },
  archived: { label: 'В архиве', className: 'bg-gray-600 text-white' },
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const id = params.id
  const viewerId = user?.id

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [guests, setGuests] = useState<GuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [reviewingGuestId, setReviewingGuestId] = useState<string | null>(null)
  const [guestReviewError, setGuestReviewError] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [ratedUsers, setRatedUsers] = useState<Set<string>>(new Set())
  const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null)
  const [ratingError, setRatingError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showCreatedToast, setShowCreatedToast] = useState(false)
  const [showReportToast, setShowReportToast] = useState(false)
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false)
  const [rsvpModalError, setRsvpModalError] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followError, setFollowError] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [guestChecklist, setGuestChecklist] = useState<Record<string, boolean>>({})
  const [meetingLinkCopied, setMeetingLinkCopied] = useState(false)
  // Точный адрес приходит отдельным запросом только для хоста/подтверждённых гостей.
  const [privateAddress, setPrivateAddress] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('created') === '1') {
      setShowCreatedToast(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Держим сердечко в актуальном состоянии: его меняют и карточки, и шапка.
  useEffect(() => {
    const sync = () => setSaved(isEventSaved(id))
    sync()
    return subscribeToEventHistory(sync)
  }, [id])

  // Загружаем событие и список гостей; loading держим до завершения обоих.
  useEffect(() => {
    let cancelled = false
    let pending = 2
    const done = () => {
      if (cancelled) return
      pending -= 1
      if (pending === 0) setLoading(false)
    }

    api
      .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
      .then((data) => {
        if (cancelled) return
        setEvent(data.event)
        setSaved(isEventSaved(data.event.id))
        recordEventView(toStoredEvent(data.event))
        if (data.event.canViewPrivateAddress) {
          api
            .get<{ success: boolean; addressPrivate: string }>(`/events/${id}/address`)
            .then((addr) => {
              if (!cancelled) setPrivateAddress(addr.addressPrivate)
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(done)

    api
      .get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
      .then((data) => {
        if (cancelled) return
        setGuests(data.guests || [])
      })
      .catch(() => {
        if (!cancelled) setGuests([])
      })
      .finally(done)

    return () => {
      cancelled = true
    }
    // viewerId в зависимостях: после восстановления сессии перезапрашиваем событие,
    // чтобы получить точный адрес, если пользователь — хост или подтверждённый гость.
  }, [id, viewerId])

  // Статус подписки на организатора.
  const followTargetId = event?.hostId
  useEffect(() => {
    if (!viewerId || !followTargetId || viewerId === followTargetId) {
      setIsFollowing(false)
      return
    }
    let cancelled = false
    api
      .get<{ success: boolean; following: boolean }>(
        `/users/${followTargetId}/follow-status`,
      )
      .then((data) => {
        if (!cancelled) setIsFollowing(data.following)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [viewerId, followTargetId])

  const confirmedGuests = guests.filter(
    (g) => g.status === 'approved' || g.status === 'attended',
  )
  const pendingGuests = guests.filter((g) => g.status === 'pending')

  const signedUp = !!(user && guests.some((g) => g.userId === user.id))
  const isHost = !!(user && event && user.id === event.hostId)
  const isPublished = event?.status === 'published'
  const isFull = !!(
    event &&
    event.maxGuests != null &&
    event._count.guests >= event.maxGuests
  )

  const myGuest = user ? guests.find((g) => g.userId === user.id) : null
  const iAttended = myGuest?.status === 'attended'

  // Конец встречи: по нему показываем «Завершено» и открываем отзывы.
  const meetingEndTs = event
    ? event.endsAt
      ? new Date(event.endsAt).getTime()
      : new Date(event.startsAt).getTime() + (event.durationMinutes ?? 0) * 60_000
    : null
  const meetingEnded = meetingEndTs != null && meetingEndTs < Date.now()
  const canReview = isHost || iAttended
  const statusBadge =
    meetingEnded && (event?.status === 'published' || event?.status === 'closed')
      ? { label: 'Завершено', className: 'bg-gray-200 text-gray-700' }
      : STATUS_BADGE[event?.status || 'draft'] || STATUS_BADGE.draft

  // Оценить можно хоста и посетивших гостей; хост оценивает только гостей.
  const rateTargets: RateTarget[] = []
  if (event && canReview) {
    if (event.host.id !== user?.id) {
      rateTargets.push({
        key: 'host',
        userId: event.host.id,
        nickname: event.host.profile?.nickname || 'Организатор',
        avatarUrl: event.host.profile?.avatarUrl,
        isHost: true,
      })
    }
    for (const guest of guests) {
      if (guest.status === 'attended' && guest.userId !== user?.id) {
        rateTargets.push({
          key: guest.id,
          userId: guest.userId,
          nickname: guest.user.profile?.nickname || 'Без имени',
          avatarUrl: guest.user.profile?.avatarUrl,
          isHost: false,
        })
      }
    }
  }
  const isApprovedGuest =
    !isHost &&
    !!myGuest &&
    (myGuest.status === 'approved' || myGuest.status === 'attended')

  // Пока заявка на рассмотрении, подтягиваем решение хоста без перезагрузки.
  useEffect(() => {
    if (myGuest?.status !== 'pending') return
    const timer = setInterval(() => {
      void api
        .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
        .then((data) => setEvent(data.event))
        .catch(() => {})
      void api
        .get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
        .then((data) => setGuests(data.guests || []))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(timer)
  }, [id, myGuest?.status])

  // Если заявку только что одобрили, добираем событие и точный адрес.
  useEffect(() => {
    if (
      !viewerId ||
      (myGuest?.status !== 'approved' && myGuest?.status !== 'attended')
    ) {
      return
    }
    let cancelled = false
    api
      .get<{ success: boolean; event: EventDetail }>(`/events/${id}`)
      .then((data) => {
        if (cancelled) return
        setEvent(data.event)
        if (!data.event.canViewPrivateAddress) return
        api
          .get<{ success: boolean; addressPrivate: string }>(`/events/${id}/address`)
          .then((addr) => {
            if (!cancelled) setPrivateAddress(addr.addressPrivate)
          })
          .catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, viewerId, myGuest?.status])

  const refetchGuests = async () => {
    const data = await api.get<{ success: boolean; guests: GuestItem[] }>(`/events/${id}/guests`)
    setGuests(data.guests || [])
  }

  const handleReviewGuest = async (guestUserId: string, action: 'approve' | 'reject') => {
    setReviewingGuestId(guestUserId)
    setGuestReviewError('')
    try {
      await api.post(`/events/${id}/guests/${guestUserId}/${action}`)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      const map: Record<string, string> = {
        EVENT_FULL: 'Свободных мест больше нет',
        NOT_A_GUEST: 'Заявка уже неактуальна',
        REQUEST_ALREADY_REVIEWED: 'Заявка уже обработана',
        ACCESS_DENIED: 'Нет доступа',
      }
      setGuestReviewError(
        e.code ? map[e.code] || 'Не удалось обработать заявку' : 'Не удалось обработать заявку',
      )
    } finally {
      setReviewingGuestId(null)
    }
  }

  const submitJoin = async (answer?: string) => {
    setRsvpSubmitting(true)
    setRsvpError('')
    setRsvpModalError('')
    try {
      await api.post(`/events/${id}/rsvp`, answer ? { answer } : undefined)
      setRsvpModalOpen(false)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as {
        code?: string
        details?: Array<{ message?: string }>
      }
      const fallback = e.details?.[0]?.message || DEFAULT_RSVP_ERROR
      const message = e.code ? (RSVP_ERRORS[e.code] ?? fallback) : fallback
      if (rsvpModalOpen) {
        setRsvpModalError(message)
      } else {
        setRsvpError(message)
      }
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const handleJoinClick = () => {
    if (!user) {
      router.replace(`/login?from=/events/${id}`)
      return
    }
    if (event?.applicationQuestion) {
      setRsvpModalError('')
      setRsvpModalOpen(true)
      return
    }
    void submitJoin()
  }

  const handleCancel = async () => {
    setRsvpSubmitting(true)
    setRsvpError('')
    try {
      await api.delete(`/events/${id}/rsvp`)
      await refetchGuests()
    } catch (err) {
      const e = (err || {}) as { code?: string }
      setRsvpError(e.code ? (RSVP_ERRORS[e.code] ?? DEFAULT_RSVP_ERROR) : DEFAULT_RSVP_ERROR)
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!user) {
      router.replace(`/login?from=/events/${id}`)
      return
    }
    if (!event) return

    setFollowLoading(true)
    setFollowError('')
    try {
      if (isFollowing) {
        await api.delete(`/users/${event.hostId}/follow`)
      } else {
        await api.post(`/users/${event.hostId}/follow`)
      }
      setIsFollowing(!isFollowing)
    } catch (err) {
      const e = (err || {}) as { code?: string }
      if (e.code === 'ALREADY_FOLLOWING') {
        setIsFollowing(true)
      } else if (e.code === 'NOT_FOLLOWING') {
        setIsFollowing(false)
      } else {
        setFollowError('Не удалось изменить подписку')
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const handleCopyMeetingLink = async () => {
    if (!event?.meetingLink) return
    try {
      await navigator.clipboard.writeText(event.meetingLink)
      setMeetingLinkCopied(true)
      window.setTimeout(() => setMeetingLinkCopied(false), 2000)
    } catch {
      // Буфер обмена может быть недоступен — ссылку можно открыть кнопкой.
    }
  }

  const handleReport = () => {
    if (!user) {
      router.replace(`/login?from=/events/${id}`)
      return
    }
    if (!window.confirm('Пожаловаться на это событие?')) return
    setShowReportToast(true)
  }

  const handleSendChat = (event: React.FormEvent) => {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    setChatMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, author: 'Вы', text, own: true },
    ])
    setChatInput('')
  }

  const toggleChecklistItem = (item: string) => {
    setGuestChecklist((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  const handleStatusChange = async (nextStatus: string) => {
    setStatusSubmitting(true)
    setStatusError('')
    try {
      const response = await api.patch<{ success: boolean; event: { status: string } }>(
        `/events/${id}`,
        { status: nextStatus },
      )
      // Обновляем только статус, сохраняя остальные данные события.
      setEvent((prev) => (prev ? { ...prev, status: response.event.status } : prev))
    } catch (err) {
      const e = (err || {}) as { message?: string }
      setStatusError(e.message || 'Не удалось изменить статус события')
    } finally {
      setStatusSubmitting(false)
    }
  }

  const handleAttendance = async (userId: string, checked: boolean) => {
    if (!event) return
    setAttendanceSubmitting(true)
    setAttendanceError('')
    const current = new Set(guests.filter((g) => g.status === 'attended').map((g) => g.userId))
    if (checked) {
      current.add(userId)
    } else {
      current.delete(userId)
    }
    try {
      const res = await api.post<{ success: boolean; guests: GuestItem[] }>(
        `/events/${event.id}/mark-attendance`,
        { userIds: Array.from(current) },
      )
      setGuests(res.guests || [])
    } catch (err) {
      const e = (err || {}) as { message?: string }
      setAttendanceError(e.message || 'Не удалось обновить посещаемость')
    } finally {
      setAttendanceSubmitting(false)
    }
  }

  const handleRate = async (userId: string) => {
    if (!event) return
    const score = scores[userId]
    const tagSlug = selectedTags[userId]
    if (!score) {
      setRatingError('Выберите оценку')
      return
    }
    if (!tagSlug) {
      setRatingError('Выберите тег')
      return
    }
    setRatingSubmitting(userId)
    setRatingError('')
    try {
      await api.post(`/events/${event.id}/ratings`, {
        ratedUserId: userId,
        score,
        tagSlug,
        comment: comments[userId]?.trim() || undefined,
      })
      setRatedUsers((prev) => new Set(prev).add(userId))
    } catch (err) {
      const e = (err || {}) as { code?: string }
      const map: Record<string, string> = {
        CANNOT_RATE_SELF: 'Нельзя оценить себя.',
        NOT_A_GUEST: 'Этот участник не был гостем, или вы не были гостем события.',
        ALREADY_RATED: 'Вы уже оценили этого участника.',
        EVENT_NOT_CLOSED: 'Событие ещё не закрыто для оценок.',
        REVIEW_WINDOW_NOT_OPEN: 'Окно оценок ещё не открылось — оно стартует через 10 часов после встречи.',
        REVIEW_WINDOW_CLOSED: 'Окно оценок закрыто — отзывы принимаются 72 часа после встречи.',
        UNKNOWN_TAG: 'Неизвестный тег.',
        TAG_NOT_ALLOWED: 'Этот тег нельзя выбрать для этого участника.',
      }
      if (e.code === 'ALREADY_RATED') {
        setRatedUsers((prev) => new Set(prev).add(userId))
      }
      setRatingError(e.code ? (map[e.code] || 'Не удалось отправить оценку') : 'Не удалось отправить оценку')
    } finally {
      setRatingSubmitting(null)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    if (!window.confirm('Удалить это событие?')) return
    try {
      await api.delete(`/events/${event.id}`)
      router.replace('/')
    } catch {
      alert('Не удалось удалить событие')
    }
  }

  const handleToggleSaved = () => {
    if (!event) return
    setSaved(toggleSavedEvent(toStoredEvent(event)))
  }

  const renderRules = () => {
    if (event?.rules == null) return null
    const rules = event.rules
    if (typeof rules === 'string') return <p>{rules}</p>
    if (Array.isArray(rules)) {
      return (
        <ul className="list-disc pl-5">
          {rules.map((r, i) => (
            <li key={i}>{String(r)}</li>
          ))}
        </ul>
      )
    }
    if (typeof rules === 'object') {
      return (
        <ul className="list-disc pl-5">
          {Object.entries(rules as Record<string, unknown>).map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {String(v)}
            </li>
          ))}
        </ul>
      )
    }
    return <pre>{JSON.stringify(rules, null, 2)}</pre>
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </main>
    )
  }

  if (notFound || !event) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Событие не найдено</h1>
            <button
              onClick={() => router.replace('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Назад к событиям
            </button>
          </div>
        </div>
      </main>
    )
  }

  const subcategoryMeta = findSubcategory(event.subcategory)
  const formatMeta = FORMAT_BY_SLUG[event.format ?? 'offline']
  const isOnline = event.format === 'online'
  const hostTimeZone = isOnline ? timeZoneForCity(event.city) : null
  const hostTime = hostTimeZone ? formatTimeInZone(event.startsAt, hostTimeZone) : ''
  const platformLabel = optionLabel(PLATFORM_OPTIONS, event.platform) || 'Онлайн'
  const platformIcon = PLATFORM_ICONS[event.platform ?? 'other'] ?? '🌐'
  const hasMeetingDetails = Boolean(
    event.durationMinutes ||
      event.waitlistEnabled ||
      event.plusOneEnabled ||
      (event.format === 'sport' &&
        (event.venueType || event.sportLevel || event.weatherDependent)) ||
      event.budgetType === 'split',
  )
  const occupancyPercent =
    event.maxGuests != null
      ? Math.min(100, Math.round((event._count.guests / event.maxGuests) * 100))
      : 0
  const privateLocation = [privateAddress, event.city].filter(Boolean).join(', ')
  const eventEndsAt =
    event.endsAt ??
    new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString()
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title,
  )}&dates=${toCalendarDate(event.startsAt)}/${toCalendarDate(
    eventEndsAt,
  )}&details=${encodeURIComponent(
    `${event.description ?? ''}${event.addressPublic ? `\n${event.addressPublic}` : ''}`,
  )}&location=${encodeURIComponent(privateLocation)}`
  const routeUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(privateLocation)}`

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      {showCreatedToast && (
        <Toast message="Событие создано" onClose={() => setShowCreatedToast(false)} />
      )}
      {showReportToast && (
        <Toast message="Жалоба отправлена" onClose={() => setShowReportToast(false)} />
      )}
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <button onClick={() => router.replace('/')} className="mb-4 text-blue-600 hover:underline">
          ← Назад к событиям
        </button>

        <EventImage
          src={event.coverImageUrl}
          alt={`Фото места: ${event.title}`}
          fallback={{
            emoji: subcategoryMeta?.emoji ?? formatMeta.emoji,
            gradient: formatMeta.gradient,
          }}
          className="mb-4 h-64 w-full rounded-lg shadow"
          loading="eager"
        />

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleReport}
                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-red-600"
              >
                ⚑ Пожаловаться
              </button>
              <button
                type="button"
                onClick={handleToggleSaved}
                aria-pressed={saved}
                className={`rounded-lg border px-3 py-1 text-sm font-medium transition hover:bg-gray-50 ${
                  saved
                    ? 'border-red-200 text-red-600'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {saved ? '♥ В избранном' : '♡ Сохранить'}
              </button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatMeta.emoji} {formatMeta.label}
            </span>
            {(subcategoryMeta?.label || event.theme) && (
              <span className="text-gray-500">
                Тема: {subcategoryMeta?.label ?? event.theme}
              </span>
            )}
          </div>
          {event.city && (
            <p className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                📍 {event.city}
              </span>
            </p>
          )}
          <p className="text-gray-700">
            🕒 {formatEventDateTime(event.startsAt)}{' '}
            <span className="text-xs text-gray-500">· по вашему времени</span>
          </p>
          {isOnline && hostTime && hostTimeZone && (
            <p className="mt-1 text-sm text-gray-500">
              У организатора: {hostTime} ({hostTimeZone})
            </p>
          )}
          {event.maxGuests != null ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {event._count.guests} из {event.maxGuests}
              </span>
              {isFull && (
                <span className="text-xs font-medium text-amber-600">Мест нет</span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Без ограничения мест</p>
          )}
          {event.description && (
            <p className="mt-4 text-gray-700 whitespace-pre-line">{event.description}</p>
          )}
          {event.tags && event.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {!isOnline && (event.addressPublic || event.hasPrivateAddress) && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Адрес</h2>
            {event.addressPublic && (
              <p className="text-gray-700">📍 {event.addressPublic}</p>
            )}
            {event.canViewPrivateAddress && privateAddress ? (
              <p className="mt-2 text-gray-900">
                <span className="font-medium">Точное место:</span> {privateAddress}
              </p>
            ) : event.hasPrivateAddress ? (
              <p className="mt-2 text-sm text-gray-500">
                🔒 Точный адрес видят только организатор и подтверждённые участники.
              </p>
            ) : null}
            {event.canViewPrivateAddress && privateAddress && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  📅 Добавить в календарь
                </a>
                {event.format !== 'online' && (
                  <a
                    href={routeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    🧭 Маршрут
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {isOnline && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Где встречаемся</h2>
            <p className="text-gray-700">
              {platformIcon} {platformLabel}
            </p>
            {event.canViewPrivateAddress && event.meetingLink ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Открыть
                </a>
                <button
                  type="button"
                  onClick={handleCopyMeetingLink}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  {meetingLinkCopied ? 'Скопировано' : 'Скопировать'}
                </button>
              </div>
            ) : event.canViewPrivateAddress ? (
              <p className="mt-2 text-sm text-gray-500">
                Ссылка пока не добавлена — можно заполнить позже.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Ссылка откроется после одобрения заявки.
              </p>
            )}
          </div>
        )}

        {hasMeetingDetails && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Детали встречи</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {event.durationMinutes != null && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  ⏱ {durationLabel(event.durationMinutes)}
                </span>
              )}
              {event.format === 'sport' && event.venueType && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  📍 {optionLabel(VENUE_TYPE_OPTIONS, event.venueType)}
                </span>
              )}
              {event.format === 'sport' && event.sportLevel && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  Уровень: {optionLabel(SPORT_LEVEL_OPTIONS, event.sportLevel)}
                </span>
              )}
              {event.format === 'sport' && event.weatherDependent && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  Погодозависимо
                </span>
              )}
              {event.waitlistEnabled && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  Лист ожидания
                </span>
              )}
              {event.plusOneEnabled && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  Можно +1
                </span>
              )}
              {event.budgetType === 'split' && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  Складчина: {event.budgetAmount ?? '—'} ₽
                  {event.budgetNote ? ` · ${event.budgetNote}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Организатор</h2>
          <div className="flex items-start gap-3">
            <Avatar url={event.host.profile?.avatarUrl} name={event.host.profile?.nickname} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/users/${event.host.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {event.host.profile?.nickname || 'Без имени'}
                </Link>
                {event.host.profile?.isVerified && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    ✓ Верифицирован
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm">
                {(event.host._count?.ratingsReceived ?? 0) > 0 ? (
                  <span className="text-gray-600">
                    <span className="text-amber-500" aria-hidden="true">
                      ★
                    </span>{' '}
                    <span className="font-medium text-gray-900">
                      {(event.host.profile?.trustScore ?? 0).toFixed(1)}
                    </span>{' '}
                    · {event.host._count?.ratingsReceived}{' '}
                    {reviewsWord(event.host._count?.ratingsReceived ?? 0)}
                  </span>
                ) : (
                  <span className="text-gray-400">Нет отзывов</span>
                )}
              </div>
              {event.host.tags && event.host.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {event.host.tags.map((tag) => (
                    <UserTagChip key={tag.slug} tag={tag} compact />
                  ))}
                </div>
              )}
              {!isHost && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`mt-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {followLoading ? '...' : isFollowing ? 'Вы подписаны' : 'Подписаться'}
                </button>
              )}
              {followError && (
                <p className="mt-1 text-xs text-red-600">{followError}</p>
              )}
            </div>
          </div>
          {event.host.email && <p className="text-sm text-gray-500">{event.host.email}</p>}
        </div>

        {isHost && pendingGuests.length > 0 && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Заявки на участие</h2>
            {guestReviewError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">
                {guestReviewError}
              </div>
            )}
            <ul className="space-y-3">
              {pendingGuests.map((g) => {
                const nickname = g.user.profile?.nickname || 'Без имени'
                return (
                  <li key={g.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar url={g.user.profile?.avatarUrl} name={nickname} />
                      <div className="min-w-0">
                        <Link
                          href={`/users/${g.userId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {nickname}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {(g.user.profile?.trustScore ?? 0) > 0 ? (
                            <>
                              <span className="text-amber-500" aria-hidden="true">
                                ★
                              </span>{' '}
                              {(g.user.profile?.trustScore ?? 0).toFixed(1)}
                            </>
                          ) : (
                            'Без отзывов'
                          )}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleReviewGuest(g.userId, 'approve')}
                          disabled={reviewingGuestId === g.userId}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {reviewingGuestId === g.userId ? '...' : 'Одобрить'}
                        </button>
                        <button
                          onClick={() => handleReviewGuest(g.userId, 'reject')}
                          disabled={reviewingGuestId === g.userId}
                          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                    {g.applicationAnswer && (
                      <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">Ответ: </span>
                        {g.applicationAnswer}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {event.applicationQuestion && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Вопрос для заявки</h2>
            <p className="text-gray-700">{event.applicationQuestion}</p>
          </div>
        )}

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Гости</h2>
          <p className="text-gray-700 mb-4">
            {event.maxGuests != null
              ? `${confirmedGuests.length} из ${event.maxGuests}`
              : `Гостей: ${confirmedGuests.length}`}
          </p>

          {confirmedGuests.length === 0 ? (
            <p className="text-gray-600">Пока никто не записался</p>
          ) : (
            <ul className="space-y-3">
              {confirmedGuests.map((g) => {
                const nickname = g.user.profile?.nickname || 'Без имени'
                return (
                  <li key={g.id} className="flex items-center gap-3">
                    <Avatar url={g.user.profile?.avatarUrl} name={nickname} />
                    <Link href={`/users/${g.userId}`} className="text-blue-600 hover:underline">
                      {nickname}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {isHost && (event.status === 'closed' || event.status === 'archived') && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Отметить присутствующих</h2>
            {attendanceError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">{attendanceError}</div>
            )}
            {confirmedGuests.length === 0 ? (
              <p className="text-gray-600">Нет записавшихся гостей</p>
            ) : (
              <ul className="space-y-2">
                {confirmedGuests.map((g) => {
                  const nickname = g.user.profile?.nickname || 'Без имени'
                  return (
                    <li key={g.id}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={g.status === 'attended'}
                          disabled={attendanceSubmitting}
                          onChange={(e) => handleAttendance(g.userId, e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">{nickname}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {(event.status === 'closed' || event.status === 'archived') && canReview && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-1">Оценить участников</h2>
            <p className="mb-3 text-xs text-gray-500">
              Отзыв анонимный: участник не увидит, кто его оставил. Нужны оценка и один тег.
            </p>
            {ratingError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-sm rounded">{ratingError}</div>
            )}
            {event.reviewWindow && !event.reviewWindow.isOpen ? (
              <p className="text-gray-600">
                {Date.now() < new Date(event.reviewWindow.opensAt).getTime()
                  ? `Оценки откроются ${formatDateTime(event.reviewWindow.opensAt)} — через 10 часов после встречи.`
                  : `Окно оценок закрылось ${formatDateTime(event.reviewWindow.closesAt)} — отзывы принимаются 72 часа после встречи.`}
              </p>
            ) : rateTargets.length === 0 ? (
              <p className="text-gray-600">Нет участников для оценки</p>
            ) : rateTargets.every((target) => ratedUsers.has(target.userId)) ? (
              <p className="text-gray-600">Вы оценили всех участников</p>
            ) : (
              <ul className="space-y-4">
                {rateTargets.map((target) => {
                  const isRated = ratedUsers.has(target.userId)
                  const isSubmitting = ratingSubmitting === target.userId
                  const audience = target.isHost ? 'host' : 'guest'
                  return (
                    <li key={target.key}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/users/${target.userId}`}
                          className="flex items-center gap-3 text-blue-600 hover:underline"
                        >
                          <Avatar url={target.avatarUrl} name={target.nickname} size="w-9 h-9" />
                          <span className="font-medium">{target.nickname}</span>
                        </Link>
                        {target.isHost && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Организатор
                          </span>
                        )}
                        {isRated ? (
                          <span className="text-sm text-green-600 font-medium">Оценён</span>
                        ) : (
                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            <select
                              value={scores[target.userId] || 0}
                              onChange={(e) =>
                                setScores((prev) => ({ ...prev, [target.userId]: Number(e.target.value) }))
                              }
                              className="p-1 border rounded text-sm"
                              disabled={isSubmitting}
                              aria-label={`Оценка для ${target.nickname}`}
                            >
                              <option value={0} disabled>
                                Оценка
                              </option>
                              {[1, 2, 3, 4, 5].map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            <select
                              value={selectedTags[target.userId] || ''}
                              onChange={(e) =>
                                setSelectedTags((prev) => ({ ...prev, [target.userId]: e.target.value }))
                              }
                              className="p-1 border rounded text-sm"
                              disabled={isSubmitting}
                              aria-label={`Тег для ${target.nickname}`}
                            >
                              <option value="" disabled>
                                Тег
                              </option>
                              {(['green', 'yellow', 'red'] as UserTagColor[]).map((color) => {
                                const options = userTagsForAudience(audience).filter(
                                  (tag) => tag.color === color,
                                )
                                if (options.length === 0) return null
                                return (
                                  <optgroup key={color} label={USER_TAG_COLOR_LABELS[color]}>
                                    {options.map((tag) => (
                                      <option key={tag.slug} value={tag.slug}>
                                        {tag.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                )
                              })}
                            </select>
                            <input
                              type="text"
                              value={comments[target.userId] || ''}
                              onChange={(e) =>
                                setComments((prev) => ({ ...prev, [target.userId]: e.target.value }))
                              }
                              placeholder="Комментарий (необязательно)"
                              className="p-1 border rounded text-sm flex-1"
                              disabled={isSubmitting}
                            />
                            <button
                              onClick={() => handleRate(target.userId)}
                              disabled={
                                isSubmitting ||
                                !scores[target.userId] ||
                                !selectedTags[target.userId]
                              }
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-60"
                            >
                              {isSubmitting ? 'Отправляем...' : 'Оценить'}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {(event.houseRules ||
          (event.houseRulesChips && event.houseRulesChips.length > 0) ||
          event.rules != null) && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Правила дома</h2>
            {event.houseRules && (
              <p className="whitespace-pre-line text-gray-700">{event.houseRules}</p>
            )}
            {event.houseRulesChips && event.houseRulesChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {event.houseRulesChips.map((rule) => (
                  <span
                    key={rule}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            )}
            {event.rules != null && <div className="mt-3 text-gray-700">{renderRules()}</div>}
          </div>
        )}

        {isApprovedGuest && (
          <>
            <div className="mt-6 p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-1">Чат события</h2>
              <p className="mb-3 text-xs text-gray-500">
                Демо-чат: сообщения хранятся локально.
              </p>
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {chatMessages.map((message) => (
                  <li key={message.id} className={message.own ? 'text-right' : ''}>
                    <div
                      className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        message.own
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {!message.own && (
                        <p className="text-xs font-medium text-gray-500">
                          {message.author}
                        </p>
                      )}
                      <p className="whitespace-pre-line">{message.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Написать сообщение..."
                  className="flex-1 rounded-lg border border-gray-300 p-2 text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  Отправить
                </button>
              </form>
            </div>

            <div className="mt-6 p-6 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">Чек-лист гостя</h2>
              <ul className="space-y-2">
                {GUEST_CHECKLIST.map((item) => (
                  <li key={item}>
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!guestChecklist[item]}
                        onChange={() => toggleChecklistItem(item)}
                        className="h-4 w-4"
                      />
                      <span className={guestChecklist[item] ? 'text-gray-400 line-through' : ''}>
                        {item}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {(event.lat != null || event.lng != null) && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Локация</h2>
            <p className="text-gray-700">
              {event.lat != null && `Широта: ${event.lat}`}
              {event.lat != null && event.lng != null && ', '}
              {event.lng != null && `Долгота: ${event.lng}`}
            </p>
          </div>
        )}

        {statusError && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">{statusError}</div>
        )}

        {rsvpError && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">{rsvpError}</div>
        )}

        {!isHost && myGuest?.status === 'pending' && (
          <div className="mt-6 p-3 bg-amber-50 text-amber-800 text-sm rounded">
            Заявка на рассмотрении у организатора.
          </div>
        )}
        {!isHost && myGuest?.status === 'rejected' && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-sm rounded">
            Организатор отклонил заявку. Можно убрать её и отправить новую.
          </div>
        )}

        {!authLoading && (
          <div className="mt-8 flex gap-3">
            {isHost ? (
              <>
                <button
                  onClick={() => router.replace(`/events/edit/${event.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Редактировать
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Удалить
                </button>
                {event.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Публикуем...' : 'Опубликовать'}
                  </button>
                )}
                {event.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Закрываем...' : 'Закрыть запись'}
                  </button>
                )}
                {event.status === 'closed' && (
                  <button
                    onClick={() => handleStatusChange('archived')}
                    disabled={statusSubmitting}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-60"
                  >
                    {statusSubmitting ? 'Архивируем...' : 'В архив'}
                  </button>
                )}
                {event.status === 'archived' && (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-white self-center">
                    В архиве
                  </span>
                )}
              </>
            ) : !isPublished ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed"
              >
                Событие ещё не открыто для записи
              </button>
            ) : signedUp && myGuest?.status === 'pending' ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled
                  className="rounded bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
                >
                  ✓ Заявка отправлена
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={rsvpSubmitting}
                  className="rounded px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {rsvpSubmitting ? 'Отменяем...' : 'Отменить заявку'}
                </button>
              </div>
            ) : signedUp && myGuest?.status === 'rejected' ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  Заявка отклонена
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={rsvpSubmitting}
                  className="rounded px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-60"
                >
                  {rsvpSubmitting ? '...' : 'Убрать заявку'}
                </button>
              </div>
            ) : signedUp &&
              (myGuest?.status === 'approved' || myGuest?.status === 'attended') ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                  ✓ Вы записаны
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={rsvpSubmitting}
                  className="rounded px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {rsvpSubmitting ? 'Отменяем...' : 'Отменить запись'}
                </button>
              </div>
            ) : isFull ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed"
              >
                Мест нет
              </button>
            ) : (
              <button
                onClick={handleJoinClick}
                disabled={rsvpSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              >
                {rsvpSubmitting ? 'Отправляем...' : 'Хочу пойти'}
              </button>
            )}
          </div>
        )}

        {rsvpModalOpen && event.applicationQuestion && (
          <RsvpQuestionModal
            eventTitle={event.title}
            question={event.applicationQuestion}
            submitting={rsvpSubmitting}
            error={rsvpModalError}
            onClose={() => {
              setRsvpModalOpen(false)
              setRsvpModalError('')
            }}
            onSubmit={(answer) => void submitJoin(answer)}
          />
        )}
      </div>
    </main>
  )
}
