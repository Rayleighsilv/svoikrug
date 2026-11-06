import Link from 'next/link'
import { FORMATS } from '@/lib/formats'

/**
 * V1-заглушка «Паспорт квартирника»: штампы за форматы встреч.
 * Пока пусто — показываем слоты и CTA на первую встречу.
 */
export default function EventPassport() {
  return (
    <section aria-labelledby="event-passport-title" className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="event-passport-title" className="text-lg font-semibold text-gray-900">
            Паспорт квартирника
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Штампы за форматы, где вы уже были. Пока пусто — значит, всё впереди.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          0 штампов
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-3">
        {FORMATS.map((format) => (
          <li
            key={format.slug}
            className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-center"
          >
            <span aria-hidden="true" className="text-2xl opacity-40 grayscale">
              {format.emoji}
            </span>
            <span className="mt-1 text-xs font-medium text-gray-500">{format.shortLabel}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
              нет штампа
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Сходить на первую встречу
      </Link>
    </section>
  )
}
