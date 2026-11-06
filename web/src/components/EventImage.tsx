'use client'

import { useState } from 'react'
import { resolveMediaUrl } from '@/lib/avatar'

type Fallback = {
  emoji: string
  gradient: string
}

const DEFAULT_FALLBACK: Fallback = {
  emoji: '🎉',
  gradient:
    'from-sky-100 via-blue-50 to-white dark:from-sky-500/25 dark:via-slate-800 dark:to-slate-800',
}

/**
 * Единый компонент фото события.
 * - пока грузится — skeleton в текущей палитре;
 * - при ошибке или отсутствии src — градиент + emoji тематики;
 * - битый alt-текст не показывается: <img> снимается с DOM при ошибке.
 */
export default function EventImage({
  src,
  alt,
  fallback = DEFAULT_FALLBACK,
  className = '',
  imgClassName = '',
  loading = 'lazy',
}: {
  src?: string | null
  alt: string
  fallback?: Fallback
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
}) {
  const resolved = resolveMediaUrl(src)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    resolved ? 'loading' : 'error',
  )
  const [trackedSrc, setTrackedSrc] = useState(resolved)

  // Сбрасываем статус синхронно при смене src: useEffect здесь мог бы
  // перезаписать уже случившийся onLoad и оставить вечный skeleton.
  if (trackedSrc !== resolved) {
    setTrackedSrc(resolved)
    setStatus(resolved ? 'loading' : 'error')
  }

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`} aria-busy={status === 'loading'}>
      {resolved && status !== 'error' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={resolved}
          src={resolved}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}

      {resolved && status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-slate-700" />
      )}

      {status === 'error' && (
        <div
          role="img"
          aria-label={alt}
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${fallback.gradient}`}
        >
          <span className="text-4xl" aria-hidden="true">
            {fallback.emoji}
          </span>
        </div>
      )}
    </div>
  )
}
