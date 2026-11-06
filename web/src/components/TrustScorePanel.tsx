const TIPS = [
  'Проведите событие и доведите его до конца',
  'Получите отзывы участников после встречи',
  'Пройдите верификацию профиля',
]

function scoreLevel(score: number): string {
  if (score >= 70) return 'Высокое доверие — вас выбирают чаще'
  if (score >= 30) return 'Доверие растёт — продолжайте в том же духе'
  return 'Начальный уровень — всё впереди'
}

type Props = {
  score: number
}

/**
 * Шкала Trust Score 0–100 с прогресс-баром и подсказками,
 * как повысить доверие в кругу.
 */
export default function TrustScorePanel({ score }: Props) {
  const value = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <section aria-labelledby="trust-score-title" className="rounded-2xl bg-blue-50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="trust-score-title" className="text-sm font-medium text-gray-700">
          Trust Score
        </h3>
        <p className="text-sm font-semibold text-gray-900">
          {value} <span className="font-normal text-gray-500">/ 100</span>
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Trust Score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-500">{scoreLevel(value)}</p>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700">Как повысить</p>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true" className="shrink-0 text-blue-600">
                •
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
