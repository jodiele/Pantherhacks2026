/** Open-Meteo: free, no API key. https://open-meteo.com */

export async function fetchCurrentUv(latitude: number, longitude: number): Promise<number> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'uv_index')
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('UV data could not be loaded.')
  }
  const data = (await res.json()) as { current?: { uv_index?: number } }
  const uv = data?.current?.uv_index
  if (typeof uv !== 'number' || Number.isNaN(uv)) {
    throw new Error('No UV index returned for this location.')
  }
  return uv
}

export type UvGuidance = {
  band: string
  summary: string
  tips: string[]
  accent: 'low' | 'moderate' | 'high' | 'veryhigh' | 'extreme'
}

/** Rough bands aligned with common public-health UV index messaging */
export function uvGuidance(uv: number): UvGuidance {
  if (uv < 3) {
    return {
      band: 'Low',
      summary: 'Minimal risk for most people. Still use protection if you burn easily or stay out long.',
      tips: [
        'Sunglasses on bright days; SPF if you’ll be outside for a while.',
        'Snow, water, and sand can reflect extra UV.',
      ],
      accent: 'low',
    }
  }
  if (uv < 6) {
    return {
      band: 'Moderate',
      summary: 'Some risk of harm from unprotected sun.',
      tips: [
        'SPF 30+ broad-spectrum, reapply every 2 hours and after swimming or sweating.',
        'Seek shade around midday when UV is strongest.',
      ],
      accent: 'moderate',
    }
  }
  if (uv < 8) {
    return {
      band: 'High',
      summary: 'Skin can burn quickly without protection.',
      tips: [
        'Reduce time in the sun 10 a.m.–4 p.m.; wear hat and long sleeves when possible.',
        'Don’t rely on clouds—UV still reaches the ground.',
      ],
      accent: 'high',
    }
  }
  if (uv < 11) {
    return {
      band: 'Very high',
      summary: 'Unprotected skin will burn rapidly.',
      tips: [
        'Treat shade, clothing, and sunscreen as required gear—not optional.',
        'Hydrate; overheating adds to heat illness risk.',
      ],
      accent: 'veryhigh',
    }
  }
  return {
    band: 'Extreme',
    summary: 'Avoid midday sun; burning happens in minutes for many skin types.',
    tips: [
      'Stay indoors or in deep shade during peak hours if you can.',
      'Extra care near water, snow, and high altitude.',
    ],
    accent: 'extreme',
  }
}

/**
 * Very rough pixel heuristic: higher when red channel dominates (demo only, not clinical).
 */
export async function estimateWarmthSignal(file: File): Promise<number> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const w = 128
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const { data } = ctx.getImageData(0, 0, w, h)
  let sum = 0
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    const excess = Math.max(0, r - (g + b) / 2)
    sum += excess
    n += 1
  }
  return n ? Math.min(1, (sum / n) * 2) : 0
}

export const SUNBURN_CARE = [
  'Cool the skin with cool (not ice-cold) compresses or a cool shower.',
  'Moisturize with gentle, fragrance-free lotion after skin cools.',
  'Drink extra water; sunburn pulls fluid to the skin.',
  'Avoid more sun on the area until healed.',
]

export const WHEN_TO_SEEK_CARE =
  'Seek urgent care for severe blistering, fever, confusion, dehydration signs, or if a large area is affected—especially in children.'

/** Severity for UI styling — not a clinical triage level */
export type BurnAlertLevel = 'info' | 'caution' | 'warning'

export type BurnAlert = {
  level: BurnAlertLevel
  headline: string
  body: string
}

/** Location-specific burn-risk messaging from the live UV index */
export function burnAlertsForUv(uv: number): BurnAlert[] {
  const alerts: BurnAlert[] = []
  const u = uv.toFixed(1)

  if (uv >= 11) {
    alerts.push({
      level: 'warning',
      headline: 'Extreme burn alert',
      body: `UV index ${u} is in the extreme range. Unprotected skin can burn in minutes. Avoid midday sun if you can; use shade, clothing, SPF 30+ (reapply), and UV-blocking sunglasses.`,
    })
  } else if (uv >= 8) {
    alerts.push({
      level: 'warning',
      headline: 'Very high burn alert',
      body: `UV ${u}: burns develop very quickly today. Treat protection as non-optional—especially between late morning and mid-afternoon.`,
    })
  } else if (uv >= 6) {
    alerts.push({
      level: 'caution',
      headline: 'High burn risk',
      body: `At UV ${u}, many people will burn without protection in well under an hour in direct midday sun. Plan shade breaks and full coverage (hat, sleeves, sunscreen).`,
    })
  } else if (uv >= 3) {
    alerts.push({
      level: 'caution',
      headline: 'Moderate UV — burns still possible',
      body: `UV ${u} can still cause sunburn with long enough exposure. Clouds block some heat but not all UV; snow, water, and concrete reflect extra rays.`,
    })
  } else {
    alerts.push({
      level: 'info',
      headline: 'Lower UV right now',
      body: `UV ${u} is relatively low at this moment, but daily minutes outside still add up. Sensitive skin and long sessions still warrant SPF and shade.`,
    })
  }

  alerts.push({
    level: uv >= 6 ? 'caution' : 'info',
    headline: 'Sun exposure adds up',
    body: 'Today’s index is a snapshot. Total time in UV over days and years drives both sunburn risk and long-term skin damage—plan habits, not just this hour.',
  })

  return alerts
}

/** Optional alert after photo “warmth” heuristic — demo only */
export function warmthPhotoBurnNotice(warmth: number): BurnAlert | null {
  if (warmth >= 0.48) {
    return {
      level: 'warning',
      headline: 'Photo warmth alert (demo)',
      body: 'The image shows a stronger informal “warm/red” signal. This is not a diagnosis. If skin feels hot, tight, or painful after sun, get into shade, cool the area, hydrate, and avoid more UV until it settles.',
    }
  }
  if (warmth >= 0.3) {
    return {
      level: 'caution',
      headline: 'Photo warmth watch (demo)',
      body: 'Moderate warmth in the photo (heuristic only). Pair with how you feel—ease off sun today if anything looks pink or stings.',
    }
  }
  return null
}

export const SUN_EXPOSURE_POINTS: { title: string; detail: string }[] = [
  {
    title: 'Cumulative dose',
    detail:
      'Sun damage is cumulative: many short exposures add up. Consistent protection matters even when you do not burn.',
  },
  {
    title: 'Peak hours',
    detail:
      'UV is usually strongest between about 10 a.m. and 4 p.m. (varies by season and location). That is when burns and long-term DNA stress happen fastest.',
  },
  {
    title: 'Tanning is still stress',
    detail:
      'A tan is the skin responding to UV injury. There is no completely “safe” tan from sunlight or tanning beds when it comes to long-term skin cancer risk.',
  },
  {
    title: 'Reflection and altitude',
    detail:
      'Water, sand, snow, and ice reflect UV. Elevation increases UV. Winter sports and beach days can surprise people with faster burns.',
  },
]

export const CANCER_AWARENESS_INTRO =
  'Ultraviolet (UV) radiation from the sun and artificial sources is a major cause of skin cancers, including melanoma and the more common basal and squamous cell types. Reducing UV exposure lowers risk over a lifetime. This app only educates—it does not screen for cancer.'

export const CANCER_AWARENESS_POINTS: string[] = [
  'Use broad-spectrum SPF 30+ on exposed skin; reapply every two hours and after swimming or heavy sweating.',
  'Wear hats, sunglasses, and clothing that covers arms and legs when UV is high.',
  'Avoid indoor tanning beds; they concentrate UV and are linked to melanoma and other skin cancers.',
  'Know your skin: new or changing spots, non-healing sores, or changing moles deserve a clinician’s look—not an app.',
]

export const CANCER_RESOURCES: { label: string; href: string }[] = [
  {
    label: 'WHO — Ultraviolet radiation (health topic)',
    href: 'https://www.who.int/health-topics/ultraviolet-radiation',
  },
  {
    label: 'American Cancer Society — Skin cancer',
    href: 'https://www.cancer.org/cancer/types/skin-cancer.html',
  },
  {
    label: 'CDC — Sun safety',
    href: 'https://www.cdc.gov/skin-cancer/sun-safety/index.html',
  },
]
