'use client'

import { useId } from 'react'

type Badge = {
  emoji: string
  label: string
  hint: string
}

const BADGES: Badge[] = [
  {
    emoji: '🎟️',
    label: 'Первый гость',
    hint: 'Сходите на первую встречу — бейдж появится автоматически.',
  },
  {
    emoji: '🏠',
    label: 'Хозяин',
    hint: 'Проведите событие и доведите его до конца.',
  },
  {
    emoji: '💬',
    label: 'Хороший гость',
    hint: 'Получите первый отзыв от хоста после встречи.',
  },
  {
    emoji: '✅',
    label: 'Проверенный',
    hint: 'Пройдите верификацию: телефон, соцсеть и видео-селфи.',
  },
]

/**
 * V1-заглушка: сетка бейджей с подсказками. Пока все не получены —
 * условия начисления описаны в tooltip.
 */
export default function ProfileBadges() {
  const baseId = useId()

  return (
    <section aria-labelledby={`${baseId}-title`} className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${baseId}-title`} className="text-lg font-semibold text-gray-900">
            Мои бейджи
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Награды за активность в кругу. Наведите на бейдж, чтобы узнать, как его получить.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          0 / {BADGES.length}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BADGES.map((badge, index) => {
          const tooltipId = `${baseId}-tip-${index}`
          return (
            <li key={badge.label} className="group relative">
              <div
                tabIndex={0}
                aria-describedby={tooltipId}
                className="flex h-full cursor-help flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span aria-hidden="true" className="text-2xl opacity-50 grayscale">
                  {badge.emoji}
                </span>
                <span className="mt-1.5 text-xs font-medium text-gray-600">{badge.label}</span>
                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                  не получен
                </span>
              </div>
              <span
                role="tooltip"
                id={tooltipId}
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-700"
              >
                {badge.hint}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
