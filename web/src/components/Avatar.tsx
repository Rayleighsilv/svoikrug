'use client'

import { useEffect, useState } from 'react'
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
  const [failed, setFailed] = useState(false)

  // Если внешний URL не загрузился — показываем инициал.
  useEffect(() => {
    setFailed(false)
  }, [resolved])

  if (resolved && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={name || 'Аватар'}
        onError={() => setFailed(true)}
        className={`${size} rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`${size} rounded-full bg-gray-300 flex items-center justify-center font-bold text-white`}>
      {initial}
    </div>
  )
}
