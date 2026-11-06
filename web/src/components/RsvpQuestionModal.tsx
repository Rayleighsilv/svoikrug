'use client'

import { useEffect, useRef, useState } from 'react'

export default function RsvpQuestionModal({
  eventTitle,
  question,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  eventTitle: string
  question: string
  submitting: boolean
  error: string
  onClose: () => void
  onSubmit: (answer: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    answerRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

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
        aria-labelledby="rsvp-question-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="rsvp-question-title" className="text-lg font-semibold text-gray-900">
              Заявка на событие
            </h2>
            <p className="mt-1 text-sm text-gray-500">{eventTitle}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {question}
        </div>

        <label
          htmlFor="rsvp-answer"
          className="mt-4 block text-sm font-medium text-gray-700"
        >
          Комментарий к заявке
        </label>
        <textarea
          ref={answerRef}
          id="rsvp-answer"
          rows={3}
          maxLength={500}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Напишите пару слов организатору..."
          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500">Ответ увидит организатор вместе с заявкой.</p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSubmit(answer.trim())}
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Отправляем...' : 'Отправить заявку'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
