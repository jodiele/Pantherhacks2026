/**
 * WeatherAPI.com — forecast for “rest of today” on the home planner.
 *
 * Setup:
 * 1. Copy `frontend/.env.example` → `.env.local` (or create `.env.local`).
 * 2. Add:  VITE_WEATHER_API_KEY=paste_your_key_here
 * 3. Restart `npm run dev` (Vite only reads env at startup).
 *
 * Free tier: https://www.weatherapi.com/
 */

export type WeatherHourSummary = {
  timeLabel: string
  summary: string
  tempC?: number
}

export function isWeatherApiConfigured(): boolean {
  const k = import.meta.env.VITE_WEATHER_API_KEY
  return typeof k === 'string' && k.trim().length > 0
}

type WeatherApiHour = {
  time?: string
  temp_c?: number
  condition?: { text?: string }
}

type WeatherApiForecastJson = {
  forecast?: {
    forecastday?: Array<{
      hour?: WeatherApiHour[]
    }>
  }
  error?: { message?: string }
}

function parseHourTime(raw: string): Date {
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/**
 * Hourly rows from now through late tonight (same day in API response).
 */
export async function fetchRestOfDayWeather(
  lat: number,
  lon: number,
): Promise<WeatherHourSummary[] | null> {
  if (!isWeatherApiConfigured()) {
    return null
  }

  const key = import.meta.env.VITE_WEATHER_API_KEY!.trim()
  const url = new URL('https://api.weatherapi.com/v1/forecast.json')
  url.searchParams.set('key', key)
  url.searchParams.set('q', `${lat},${lon}`)
  url.searchParams.set('days', '1')
  url.searchParams.set('aqi', 'no')
  url.searchParams.set('alerts', 'no')

  const res = await fetch(url.toString())
  const data = (await res.json()) as WeatherApiForecastJson

  if (!res.ok || data.error?.message) {
    const msg = data.error?.message ?? `Weather API error (${res.status})`
    throw new Error(msg)
  }

  const hours = data.forecast?.forecastday?.[0]?.hour ?? []
  if (!hours.length) {
    return []
  }

  const now = Date.now()
  const windowStart = now - 30 * 60 * 1000

  const rows: WeatherHourSummary[] = hours
    .map((h) => {
      const t = h.time ? parseHourTime(h.time) : null
      if (!t || t.getTime() === 0) return null
      return {
        at: t.getTime(),
        timeLabel: t.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }),
        summary: h.condition?.text?.trim() || '—',
        tempC: typeof h.temp_c === 'number' ? h.temp_c : undefined,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.at >= windowStart)
    .sort((a, b) => a.at - b.at)
    .map(({ timeLabel, summary, tempC }) => ({ timeLabel, summary, tempC }))

  return rows.slice(0, 14)
}
