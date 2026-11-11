import { USER_TAG_COLOR_STYLES, type UserTagColor } from '@/lib/userTags'

export default function UserTagChip({
  tag,
  count,
  compact = false,
  className = '',
}: {
  tag: { label: string; color: UserTagColor }
  count?: number
  compact?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${USER_TAG_COLOR_STYLES[tag.color]} ${className}`}
    >
      {tag.label}
      {count != null && count > 1 && <span className="opacity-70">×{count}</span>}
    </span>
  )
}
