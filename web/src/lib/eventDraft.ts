import { findSubcategory, type EventFormat } from './formats'

export type DraftSportLevel = '' | 'beginner' | 'amateur' | 'pro'
export type DraftBudgetType = 'free' | 'split'

export type EventDraft = {
  version: 1
  step: number
  title: string
  description: string
  format: EventFormat
  subcategory: string
  city: string
  addressPublic: string
  addressPrivate: string
  venueType: string
  platform: string
  startsAt: string
  durationMinutes: number
  maxGuests: string
  waitlistEnabled: boolean
  plusOneEnabled: boolean
  houseRules: string
  houseRulesChips: string[]
  applicationQuestion: string
  tags: string[]
  sportLevel: DraftSportLevel
  weatherDependent: boolean
  budgetType: DraftBudgetType
  budgetAmount: string
  budgetNote: string
  savedAt: string
}

export type EventDraftData = Omit<EventDraft, 'version' | 'savedAt'>

export const DRAFT_VERSION = 1
const DRAFT_KEY = 'sk_event_draft_v1'
const DB_NAME = 'sk_event_draft'
const STORE = 'covers'
const COVER_KEY = 'current'

export function defaultDraft(): EventDraftData {
  return {
    step: 0,
    title: '',
    description: '',
    format: 'offline',
    subcategory: '',
    city: '',
    addressPublic: '',
    addressPrivate: '',
    venueType: 'court',
    platform: 'discord',
    startsAt: '',
    durationMinutes: 180,
    maxGuests: '',
    waitlistEnabled: false,
    plusOneEnabled: false,
    houseRules: '',
    houseRulesChips: [],
    applicationQuestion: '',
    tags: [],
    sportLevel: '',
    weatherDependent: false,
    budgetType: 'free',
    budgetAmount: '',
    budgetNote: '',
  }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeDraft(input: Partial<EventDraft> | null): EventDraft | null {
  if (!input || input.version !== DRAFT_VERSION) return null
  const defaults = defaultDraft()

  const format: EventFormat =
    input.format === 'sport' || input.format === 'online' || input.format === 'offline'
      ? input.format
      : defaults.format
  const rawSubcategory = asString(input.subcategory, '')
  const subcategory =
    rawSubcategory && findSubcategory(rawSubcategory)?.format.slug === format
      ? rawSubcategory
      : ''
  const sportLevel: DraftSportLevel =
    input.sportLevel === 'beginner' ||
    input.sportLevel === 'amateur' ||
    input.sportLevel === 'pro'
      ? input.sportLevel
      : ''
  const budgetType: DraftBudgetType =
    input.budgetType === 'split' ? 'split' : 'free'
  const step =
    typeof input.step === 'number' && Number.isInteger(input.step)
      ? Math.min(4, Math.max(0, input.step))
      : 0
  const durationMinutes =
    typeof input.durationMinutes === 'number' &&
    Number.isInteger(input.durationMinutes) &&
    input.durationMinutes >= 15 &&
    input.durationMinutes <= 720
      ? input.durationMinutes
      : defaults.durationMinutes

  return {
    ...defaults,
    ...input,
    version: DRAFT_VERSION,
    step,
    title: asString(input.title, defaults.title),
    description: asString(input.description, defaults.description),
    format,
    subcategory,
    city: asString(input.city, defaults.city),
    addressPublic: asString(input.addressPublic, defaults.addressPublic),
    addressPrivate: asString(input.addressPrivate, defaults.addressPrivate),
    venueType: asString(input.venueType, defaults.venueType),
    platform: asString(input.platform, defaults.platform),
    startsAt: asString(input.startsAt, defaults.startsAt),
    durationMinutes,
    maxGuests: asString(input.maxGuests, defaults.maxGuests),
    waitlistEnabled: asBoolean(input.waitlistEnabled, defaults.waitlistEnabled),
    plusOneEnabled: asBoolean(input.plusOneEnabled, defaults.plusOneEnabled),
    houseRules: asString(input.houseRules, defaults.houseRules),
    houseRulesChips: asStringArray(input.houseRulesChips),
    applicationQuestion: asString(input.applicationQuestion, defaults.applicationQuestion),
    tags: asStringArray(input.tags),
    sportLevel,
    weatherDependent: asBoolean(input.weatherDependent, defaults.weatherDependent),
    budgetType,
    budgetAmount: asString(input.budgetAmount, defaults.budgetAmount),
    budgetNote: asString(input.budgetNote, defaults.budgetNote),
    savedAt: asString(input.savedAt, ''),
  }
}

export function loadDraft(): EventDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return normalizeDraft(JSON.parse(raw) as Partial<EventDraft>)
  } catch {
    return null
  }
}

export function saveDraft(data: EventDraftData) {
  if (typeof window === 'undefined') return
  try {
    const draft: EventDraft = {
      ...data,
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Переполненное/недоступное хранилище — не блокируем форму.
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

type StoredCover = {
  blob: Blob
  name: string
  type: string
  lastModified: number
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null)
      return
    }
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export async function saveDraftCover(file: File | null): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    if (file) {
      store.put(
        {
          blob: file,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        } satisfies StoredCover,
        COVER_KEY,
      )
    } else {
      store.delete(COVER_KEY)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

export async function loadDraftCover(): Promise<File | null> {
  const db = await openDb()
  if (!db) return null
  const stored = await new Promise<StoredCover | null>((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(COVER_KEY)
    request.onsuccess = () => resolve((request.result as StoredCover | undefined) ?? null)
    request.onerror = () => resolve(null)
  })
  db.close()

  if (!stored || !(stored.blob instanceof Blob)) return null
  return new File([stored.blob], stored.name || 'cover', {
    type: stored.type || stored.blob.type,
    lastModified: stored.lastModified || Date.now(),
  })
}

export async function clearDraftCover(): Promise<void> {
  try {
    await saveDraftCover(null)
  } catch {
    // IndexedDB может быть недоступен — черновик полей всё равно очищен.
  }
}
