'use client'

export const WIZARD_STEPS = [
  'Основное',
  'Место',
  'Время и гости',
  'Правила и вайб',
  'Проверка',
] as const

export default function EventWizardProgress({
  step,
  onStepClick,
}: {
  step: number
  onStepClick: (index: number) => void
}) {
  return (
    <ol className="mt-4 grid grid-cols-5 gap-2" aria-label="Шаги создания события">
      {WIZARD_STEPS.map((label, index) => {
        const active = index === step
        const done = index < step
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => onStepClick(index)}
              aria-current={active ? 'step' : undefined}
              className="w-full text-left"
            >
              <span
                className={`block h-1.5 rounded-full transition ${
                  active || done ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
              <span
                className={`mt-2 flex items-center gap-1.5 text-xs transition ${
                  active ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? 'bg-blue-600 text-white'
                      : done
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
