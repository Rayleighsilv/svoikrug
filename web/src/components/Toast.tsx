'use client'

import { useEffect, useRef } from 'react'

export default function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-4 sm:translate-x-0"
    >
      <span aria-hidden="true">✓ </span>
      {message}
    </div>
  )
}
