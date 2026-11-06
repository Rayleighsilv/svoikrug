import { plural } from './reviews'

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function relativeDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'завтра'
  if (diff === 2) return 'через 2 дня'
  if (diff === -1) return 'вчера'
  if (diff > 0) return `через ${diff} ${plural(diff, 'день', 'дня', 'дней')}`
  const abs = Math.abs(diff)
  return `${abs} ${plural(abs, 'день', 'дня', 'дней')} назад`
}

/** «пт 07.11, 19:30 · через 2 дня» */
export function formatEventDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${WEEKDAYS[date.getDay()]} ${day}.${month}, ${hours}:${minutes} · ${relativeDayLabel(iso)}`
}
