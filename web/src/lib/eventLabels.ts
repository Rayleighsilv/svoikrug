export const DURATION_OPTIONS = [60, 90, 120, 180, 240, 300, 360, 480]

export function durationLabel(minutes: number): string {
  const hours = minutes / 60
  const mod10 = Number.isInteger(hours) ? hours % 10 : -1
  const mod100 = Number.isInteger(hours) ? hours % 100 : -1
  const word = !Number.isInteger(hours)
    ? 'часа'
    : mod10 === 1 && mod100 !== 11
      ? 'час'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'часа'
        : 'часов'
  return `${String(hours).replace('.', ',')} ${word}`
}

export const SPORT_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Новичок' },
  { value: 'amateur', label: 'Любитель' },
  { value: 'pro', label: 'Профи' },
] as const

export type SportLevelValue = (typeof SPORT_LEVEL_OPTIONS)[number]['value']

export const VENUE_TYPE_OPTIONS = [
  { value: 'court', label: 'Корт' },
  { value: 'park', label: 'Парк' },
  { value: 'yard', label: 'Двор' },
  { value: 'other', label: 'Другое' },
]

export const PLATFORM_OPTIONS = [
  { value: 'discord', label: 'Discord' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'steam', label: 'Steam' },
  { value: 'other', label: 'Другое' },
]

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value?: string | null,
): string {
  return options.find((option) => option.value === value)?.label ?? ''
}
