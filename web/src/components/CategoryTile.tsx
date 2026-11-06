import Link from 'next/link'

type Props = {
  label: string
  emoji: string
  meta?: string
  gradient: string
  active?: boolean
  href?: string
  onClick?: () => void
  heightClass?: string
}

/**
 * Плитка категории в текущем стиле: подпись и счётчик сверху,
 * крупная emoji-иллюстрация снизу справа.
 */
export default function CategoryTile({
  label,
  emoji,
  meta,
  gradient,
  active = false,
  href,
  onClick,
  heightClass = 'h-28',
}: Props) {
  const className = `group relative flex w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${heightClass} ${gradient} ${
    active ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200/70 dark:ring-slate-700'
  }`

  const content = (
    <>
      <span className="relative z-10 block max-w-[75%] text-sm font-semibold leading-snug text-gray-900">
        {label}
      </span>
      {meta && (
        <span className="relative z-10 mt-1 block max-w-[80%] text-xs text-gray-600">
          {meta}
        </span>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2 -right-1 text-5xl transition-transform duration-200 group-hover:scale-110"
      >
        {emoji}
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {content}
    </button>
  )
}
