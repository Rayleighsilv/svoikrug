import type { EventFormat } from './formats'

// Сохранённые и просмотренные события хранятся только в браузере.
// Это не токены и не персональные данные — безопасно для localStorage.
export type StoredEvent = {
  id: string
  title: string
  coverImageUrl?: string | null
  theme?: string | null
  subcategory?: string | null
  format?: EventFormat | null
  city?: string | null
  startsAt: string
  hostName?: string | null
}

const VIEWED_KEY = 'sk_viewed_events'
const SAVED_KEY = 'sk_saved_events'
const LIMIT = 8
const HISTORY_EVENT = 'sk:event-history'

function read(key: string): StoredEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is StoredEvent =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as StoredEvent).id === 'string' &&
        typeof (item as StoredEvent).title === 'string',
    )
  } catch {
    return []
  }
}

function write(key: string, events: StoredEvent[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(events))
  } catch {
    // Приватный режим или переполненное хранилище — молча пропускаем.
  }
}

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HISTORY_EVENT))
  }
}

export function getSavedEvents(): StoredEvent[] {
  return read(SAVED_KEY)
}

export function getRecentlyViewed(): StoredEvent[] {
  return read(VIEWED_KEY)
}

export function recordEventView(event: StoredEvent) {
  const next = [event, ...read(VIEWED_KEY).filter((item) => item.id !== event.id)].slice(0, LIMIT)
  write(VIEWED_KEY, next)
  emit()
}

export function isEventSaved(id: string): boolean {
  return read(SAVED_KEY).some((item) => item.id === id)
}

export function toggleSavedEvent(event: StoredEvent): boolean {
  const list = read(SAVED_KEY)
  const exists = list.some((item) => item.id === event.id)
  const next = exists
    ? list.filter((item) => item.id !== event.id)
    : [event, ...list].slice(0, LIMIT)
  write(SAVED_KEY, next)
  emit()
  return !exists
}

export function subscribeToEventHistory(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(HISTORY_EVENT, listener)
  return () => window.removeEventListener(HISTORY_EVENT, listener)
}
