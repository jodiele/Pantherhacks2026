function looksCloudyOrWet(condition: string): boolean {
  return /cloud|overcast|fog|rain|drizzle|shower|mist|snow|sleet|hail/i.test(
    condition,
  )
}

/** One line combining peak UV and optional weather wording */
export function buildTodayVibe(
  peakUv: number,
  peakLabel: string,
  conditionText: string | null,
): string {
  const wxSoft =
    conditionText && looksCloudyOrWet(conditionText)
      ? ' Clouds and rain don’t block all UV—still worth covering up if you’re out.'
      : ''

  if (peakUv >= 11) {
    return `Extreme UV near ${peakLabel}—shade, SPF 50+, and a hat if you’ll be outside then.${wxSoft}`
  }
  if (peakUv >= 8) {
    return `Strong sun around ${peakLabel}—prioritize shade and SPF 30+ for unprotected skin.${wxSoft}`
  }
  if (peakUv >= 6) {
    return `UV climbs through ${peakLabel}—sunscreen and breaks in the shade add up.${wxSoft}`
  }
  if (peakUv >= 3) {
    return `Moderate UV today (peak ~${peakLabel})—SPF still helps on longer outings.${wxSoft}`
  }
  return `UV stays fairly low; peak around ${peakLabel}.${wxSoft}`
}
