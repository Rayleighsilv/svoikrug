const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

/**
 * Приводит путь загруженного файла (аватар, обложка события) к абсолютному URL.
 * Относительные пути вида /uploads/... обслуживаются бэкендом,
 * поэтому к ним добавляем базовый адрес API. Абсолютные URL оставляем как есть.
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export const resolveAvatarUrl = resolveMediaUrl
