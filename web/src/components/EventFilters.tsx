'use client'

export type EventFiltersValue = {
  dateFrom: string
  dateTo: string
  onlyAvailable: boolean
  guestsMin: string
  guestsMax: string
}

export const EMPTY_EVENT_FILTERS: EventFiltersValue = {
  dateFrom: '',
  dateTo: '',
  onlyAvailable: false,
  guestsMin: '',
  guestsMax: '',
}

export function hasActiveFilters(value: EventFiltersValue): boolean {
  return Boolean(
    value.dateFrom || value.dateTo || value.onlyAvailable || value.guestsMin || value.guestsMax,
  )
}

/**
 * Боковая панель фильтров списка встреч: дата, свободные места
 * и количество уже записавшихся гостей.
 */
export default function EventFilters({
  value,
  onChange,
}: {
  value: EventFiltersValue
  onChange: (next: EventFiltersValue) => void
}) {
  const update = (patch: Partial<EventFiltersValue>) => onChange({ ...value, ...patch })
  const active = hasActiveFilters(value)
  const inputClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-400'

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-gray-900">Фильтры</span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_EVENT_FILTERS)}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Сбросить
          </button>
        )}
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Дата</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-xs text-gray-500">
            С
            <input
              type="date"
              value={value.dateFrom}
              onChange={(event) => update({ dateFrom: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-gray-500">
            По
            <input
              type="date"
              value={value.dateTo}
              min={value.dateFrom || undefined}
              onChange={(event) => update({ dateTo: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Места</legend>
        <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value.onlyAvailable}
            onChange={(event) => update({ onlyAvailable: event.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600"
          />
          Только со свободными местами
        </label>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Уже собрано
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-xs text-gray-500">
            От
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={value.guestsMin}
              onChange={(event) => update({ guestsMin: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-gray-500">
            До
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="∞"
              value={value.guestsMax}
              onChange={(event) => update({ guestsMax: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <p className="mt-1.5 text-xs text-gray-400">Количество записавшихся гостей</p>
      </fieldset>
    </div>
  )
}
