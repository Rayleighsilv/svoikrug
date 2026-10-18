'use client'

import { resolveAvatarUrl } from '@/lib/avatar'

export default function Avatar({
  url,
  name,
  size = 'w-10 h-10',
}: {
  url?: string | null
  name?: string | null
  size?: string
}) {
  const resolved = resolveAvatarUrl(url)
  const initial = (name || '?').charAt(0).toUpperCase()

  if (resolved) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resolved} alt={name || 'Аватар'} className={`${size} rounded-full object-cover`} />
  }

  return (
    <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center font-bold text-white`}>
      {initial}
    </div>
  )
}
