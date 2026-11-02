/**
 * Каноническая форма города для записи и фильтрации:
 * trim, схлопывание внутренних пробелов, первая буква заглавная,
 * остальные строчные (работает для кириллицы и латиницы).
 */
export function normalizeCity(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, ' ')
  if (!collapsed) return ''
  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1).toLowerCase()
}

/** Регистронезависимый ключ для сравнения и поиска по префиксу. */
export function cityKey(value: string): string {
  return normalizeCity(value).toLowerCase()
}
