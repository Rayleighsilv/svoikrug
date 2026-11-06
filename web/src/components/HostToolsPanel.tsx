import Link from 'next/link'

const TOOLS = [
  {
    href: '/events/new',
    emoji: '✨',
    label: 'Создать событие',
    hint: 'Соберите своих за пару минут',
  },
  {
    href: '/hosts#passport',
    emoji: '🪪',
    label: 'Паспорт хоста',
    hint: 'Профиль, рейтинг и доверие',
  },
  {
    href: '/hosts#safety',
    emoji: '🛡',
    label: 'Безопасность и правила',
    hint: 'Как встречаться спокойно',
  },
]

export default function HostToolsPanel() {
  return (
    <section className="mb-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Всё для хостов</h2>
          <p className="text-sm text-gray-500">
            Помогаем собрать встречу и позаботиться о гостях
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Стать хостом
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl shadow-sm">
              {tool.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">
                {tool.label}
              </span>
              <span className="block truncate text-xs text-gray-500">{tool.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
