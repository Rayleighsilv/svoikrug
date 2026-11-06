// Русское склонение по числу: 1 встреча, 2 встречи, 5 встреч.
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function reviewsWord(count: number): string {
  return plural(count, 'отзыв', 'отзыва', 'отзывов')
}

export function meetingsWord(count: number): string {
  return plural(count, 'встреча', 'встречи', 'встреч')
}
