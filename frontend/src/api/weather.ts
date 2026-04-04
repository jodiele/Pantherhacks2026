/**
 * WeatherAPI.com — today’s snapshot + 7-day outlook for the home planner.
 *
 * Setup:
 * 1. Copy `frontend/.env.example` → `.env.local` (or create `.env.local`).
 * 2. Add:  VITE_WEATHER_API_KEY=paste_your_key_here
 * 3. Restart `npm run dev` (Vite only reads env at startup).
 *
 * Free tier: https://www.weatherapi.com/
 */

export type WeatherWeekDayRow = {
  date: string
  /** “Today” or short weekday */
  label: string
  highTempC: number
  lowTempC: number
  conditionText: string
}

export type WeatherHomeOverview = {
  currentTempC: number
  highTempC: number
  lowTempC: number
  /** Short phrase, e.g. “Mostly sunny” */
  conditionText: string
  /** Usually 7 entries (today + next 6), or fewer if the plan limits days */
  week: WeatherWeekDayRow[]
}

export function isWeatherApiConfigured(): boolean {
  const k = import.meta.env.VITE_WEATHER_API_KEY
  return typeof k === 'string' && k.trim().length > 0
}

type WeatherApiForecastJson = {
  current?: {
    temp_c?: number
    condition?: { text?: string }
  }
  forecast?: {
    forecastday?: Array<{
      date?: string
      day?: {
        maxtemp_c?: number
        mintemp_c?: number
        condition?: { text?: string }
      }
    }>
  }
  error?: { message?: string }
}

function toSentenceCase(s: string): string {
  const t = s.trim().toLowerCase()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function weekdayShortLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

/**
 * Current conditions, today’s high/low, and up to 7 days of highs/lows + conditions.
 */
export async function fetchTodayWeatherOverview(
  lat: number,
  lon: number,
): Promise<WeatherHomeOverview | null> {
  if (!isWeatherApiConfigured()) {
    return null
  }

  const key = import.meta.env.VITE_WEATHER_API_KEY!.trim()
  const url = new URL('https://api.weatherapi.com/v1/forecast.json')
  url.searchParams.set('key', key)
  url.searchParams.set('q', `${lat},${lon}`)
  url.searchParams.set('days', '7')
  url.searchParams.set('aqi', 'no')
  url.searchParams.set('alerts', 'no')

  const res = await fetch(url.toString())
  const data = (await res.json()) as WeatherApiForecastJson

  if (!res.ok || data.error?.message) {
    const msg = data.error?.message ?? `Weather API error (${res.status})`
    throw new Error(msg)
  }

  const currentTemp = data.current?.temp_c
  const forecastDays = data.forecast?.forecastday ?? []
  const todayBlock = forecastDays[0]?.day
  const high = todayBlock?.maxtemp_c
  const low = todayBlock?.mintemp_c

  if (
    typeof currentTemp !== 'number' ||
    typeof high !== 'number' ||
    typeof low !== 'number'
  ) {
    return null
  }

  const rawCondition =
    data.current?.condition?.text?.trim() ||
    todayBlock?.condition?.text?.trim() ||
    ''

  const week: WeatherWeekDayRow[] = []
  for (let i = 0; i < forecastDays.length; i++) {
    const fd = forecastDays[i]
    const date = fd.date?.trim() ?? `day-${i}`
    const d = fd.day
    const hi = d?.maxtemp_c
    const lo = d?.mintemp_c
    if (typeof hi !== 'number' || typeof lo !== 'number') continue
    week.push({
      date,
      label: weekdayShortLabel(date, i === 0),
      highTempC: hi,
      lowTempC: lo,
      conditionText: toSentenceCase(d?.condition?.text ?? '') || '—',
    })
  }

  return {
    currentTempC: currentTemp,
    highTempC: high,
    lowTempC: low,
    conditionText: toSentenceCase(rawCondition) || '—',
    week,
  }
}
