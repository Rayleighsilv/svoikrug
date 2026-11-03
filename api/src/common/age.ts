// Возраст по дате рождения. Считаем по UTC: дата хранится как DATE.
export function calculateAge(birthDate?: Date | string | null): number | null {
  if (!birthDate) return null
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  let age = today.getUTCFullYear() - date.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - date.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < date.getUTCDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}
