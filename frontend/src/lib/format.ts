export function formatLabel(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function topScores(scores: Record<string, number>, n = 5) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

export function parseCoord(raw: string, min: number, max: number): number | null {
  const v = Number.parseFloat(raw.trim())
  if (Number.isNaN(v) || v < min || v > max) return null
  return v
}
