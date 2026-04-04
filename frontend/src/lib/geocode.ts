/**
 * Open-Meteo geocoding (free, no API key).
 * https://open-meteo.com/en/docs/geocoding-api
 *
 * Reverse lookup for GPS: BigDataCloud client API (free, no key, browser-friendly).
 * https://www.bigdatacloud.net/packages/reverse-geocoding
 */

/** US two-letter → typical admin1 string returned by Open-Meteo */
const US_STATE_BY_ABBREV: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

export type GeocodeHit = {
  lat: number
  lon: number
  /** Human-readable, e.g. "Austin, Texas, United States" */
  label: string
}

type OmResult = {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
  country_code?: string
}

function normalizeExpectedState(stateRaw: string): string | null {
  const s = stateRaw.trim()
  if (!s) return null
  if (s.length === 2) {
    const full = US_STATE_BY_ABBREV[s.toUpperCase()]
    return full ? full.toLowerCase() : s.toLowerCase()
  }
  return s.toLowerCase()
}

function admin1Matches(admin1: string | undefined, expected: string | null): boolean {
  if (!expected) return true
  if (!admin1) return false
  const a = admin1.toLowerCase()
  return a === expected || a.includes(expected) || expected.includes(a)
}

function formatLabel(r: OmResult): string {
  const parts = [r.name, r.admin1, r.country].filter(Boolean)
  return parts.join(', ')
}

/**
 * If user types "Austin, TX" in the city field and leaves state blank, split it.
 */
function splitCityAndState(cityRaw: string, stateRaw: string): {
  city: string
  state: string
} {
  let city = cityRaw.trim()
  let state = stateRaw.trim()
  if (!state && city.includes(',')) {
    const i = city.indexOf(',')
    state = city.slice(i + 1).trim()
    city = city.slice(0, i).trim()
  }
  return { city, state }
}

/**
 * Resolve city (+ optional US state) to coordinates.
 * State strongly recommended for common city names (e.g. Springfield).
 *
 * Note: Open-Meteo returns **no results** if `name` contains a comma (e.g. "X, California").
 * We always search by **city name only** and filter by state locally.
 */
export async function geocodeCityState(
  city: string,
  state: string,
): Promise<GeocodeHit> {
  const { city: c, state: s } = splitCityAndState(city, state)
  if (!c) {
    throw new Error('Enter a city.')
  }

  const stateNorm = normalizeExpectedState(s)

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', c)
  url.searchParams.set('count', '25')
  url.searchParams.set('language', 'en')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('Could not look up that place right now.')
  }

  const data = (await res.json()) as { results?: OmResult[] }
  const results = data.results ?? []
  if (!results.length) {
    throw new Error(
      `No matches for “${c}”. Check spelling or try a larger nearby city.`,
    )
  }

  const cityLower = c.toLowerCase()

  let pool = results.filter((r) => r.name.toLowerCase() === cityLower)
  if (!pool.length) {
    pool = results.filter((r) => r.name.toLowerCase().includes(cityLower))
  }
  if (!pool.length) {
    pool = results
  }

  if (stateNorm) {
    const usFirst = pool.filter((r) => r.country_code === 'US')
    const searchIn = usFirst.length ? usFirst : pool
    const byState = searchIn.filter((r) => admin1Matches(r.admin1, stateNorm))
    if (byState.length) {
      const pick = byState[0]
      return {
        lat: pick.latitude,
        lon: pick.longitude,
        label: formatLabel(pick),
      }
    }
    throw new Error(
      `No “${c}” found in that state or region. Check spelling (try “CA” or “California”) or clear state to use the first global match.`,
    )
  }

  const pick = pool[0]
  return {
    lat: pick.latitude,
    lon: pick.longitude,
    label: formatLabel(pick),
  }
}

type BigDataCloudReverse = {
  locality?: string
  city?: string
  principalSubdivision?: string
  countryName?: string
}

/**
 * Turn coordinates into a short label like “Mountain View, California”.
 * Returns null if the lookup fails or the area has no usable fields.
 */
export async function reverseGeocodeLatLon(
  lat: number,
  lon: number,
): Promise<string | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('localityLanguage', 'en')

  const controller = new AbortController()
  const t = window.setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as BigDataCloudReverse

    const place =
      data.locality?.trim() ||
      data.city?.trim() ||
      ''
    const region = data.principalSubdivision?.trim() || ''

    if (place && region) {
      if (place.toLowerCase() === region.toLowerCase()) {
        return place
      }
      return `${place}, ${region}`
    }
    if (place) return place
    if (region) return region

    const country = data.countryName?.trim()
    if (country) {
      return country.replace(/\s*\(the\)\s*$/i, '').trim()
    }
    return null
  } catch {
    return null
  } finally {
    window.clearTimeout(t)
  }
}
