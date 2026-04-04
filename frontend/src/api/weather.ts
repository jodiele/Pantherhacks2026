/**
 * Optional team weather layer (OpenWeather, WeatherAPI, etc.).
 * Add to frontend/.env.local:
 *   VITE_WEATHER_API_KEY=your_key_here
 * Then implement the fetch below to match your partner’s API.
 */

export type WeatherHourSummary = {
  /** ISO or display time from provider */
  timeLabel: string
  /** Short condition text */
  summary: string
  /** °C if available */
  tempC?: number
}

export function isWeatherApiConfigured(): boolean {
  const k = import.meta.env.VITE_WEATHER_API_KEY
  return typeof k === 'string' && k.trim().length > 0
}

/**
 * Returns null if no key, or if not implemented yet (partner wires this up).
 * Example (OpenWeather 5-day / 3h): parse list[].dt_txt, weather[0].description, main.temp
 */
export async function fetchRestOfDayWeather(
  _lat: number,
  _lon: number,
): Promise<WeatherHourSummary[] | null> {
  if (!isWeatherApiConfigured()) {
    return null
  }
  // TODO (partner): call your weather API with import.meta.env.VITE_WEATHER_API_KEY
  return null
}
