'use client'

import { useEffect } from 'react'

/**
 * Регистрирует service worker для офлайн-оболочки и PWA-режима.
 * В dev тоже включаем: SW использует network-first, поэтому свежие
 * данные в сети всегда приоритетнее кэша.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Без SW приложение продолжает работать онлайн — не мешаем пользователю.
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
