'use client'

import { useEffect, useRef } from 'react'

const STEPS = [
  {
    title: 'Подтверждение телефона',
    description: 'Отправим SMS с кодом — убедимся, что вы реальный человек.',
  },
  {
    title: 'Привязка соцсети',
    description: 'Покажите профиль, чтобы хост мог узнать вас до встречи.',
  },
  {
    title: 'Видео-селфи',
    description: 'Короткое видео на 10–15 секунд подтвердит, что фото в профиле ваше.',
  },
]

const BENEFITS = [
  { icon: '🛡️', text: 'Доверие участников и хостов' },
  { icon: '🔒', text: 'Доступ к закрытым сборам' },
  { icon: '✅', text: 'Бейдж в карточках и профиле' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function VerificationModal({ open, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Escape + блокировка прокрутки страницы под модалкой.
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="verification-title" className="text-lg font-semibold text-gray-900">
            Верификация
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Три коротких шага — и у вас бейдж, который повышает доверие и открывает доступ к
            закрытым сборам.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.text}
                className="rounded-xl bg-gray-50 p-2.5 text-center text-xs text-gray-600"
              >
                <span aria-hidden="true" className="block text-lg">
                  {benefit.icon}
                </span>
                <span className="mt-1 block leading-snug">{benefit.text}</span>
              </li>
            ))}
          </ul>

          <ol className="mt-5 space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{step.title}</span>
                  <span className="mt-0.5 block text-sm text-gray-500">
                    {step.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">Займёт около 3 минут.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}
