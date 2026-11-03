// Возраст считаем по UTC-компонентам: дата рождения хранится как DATE
// и приходит с API в виде ISO-строки на полночь UTC.
export function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  let age = today.getUTCFullYear() - date.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - date.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < date.getUTCDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

export function formatAge(age: number): string {
  const mod10 = age % 10
  const mod100 = age % 100
  if (mod10 === 1 && mod100 !== 11) return `${age} год`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} года`
  return `${age} лет`
}

export function formatBirthDate(birthDate?: string | null): string | null {
  if (!birthDate) return null
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
