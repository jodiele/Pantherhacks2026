/** Known bad spellings from legacy model class names → display fix. */
const LABEL_SPELL_FIX: Record<string, string> = {
  oliy: 'oily',
}

export function formatLabel(slug: string) {
  const parts = slug.trim().split('-').filter(Boolean)
  const fixed = parts.map((w) => {
    const lower = w.toLowerCase()
    const rep = LABEL_SPELL_FIX[lower]
    if (rep) return rep.charAt(0).toUpperCase() + rep.slice(1)
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })
  return fixed.join(' ')
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
