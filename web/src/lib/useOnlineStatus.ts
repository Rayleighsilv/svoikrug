'use client'

import { useEffect, useState } from 'react'

/**
 * Статус сети для PWA-состояний. Стартуем с true, чтобы не ломать SSR,
 * и уточняем после монтирования — так разметка гидратируется без рассинхрона.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}
