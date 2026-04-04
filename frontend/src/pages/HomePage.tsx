import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTodayWeatherOverview, isWeatherApiConfigured } from '../api/weather'
import { useSunCheck } from '../context/SunCheckContext'
import { fetchTodayUvPlan, type TodayUvPlan, uvGuidance } from '../sunburn'

const featureCards = [
  {
    to: '/uv',
    title: 'UV & burn alerts',
    text: 'Live index, location or city/state, and burn-risk messaging.',
  },
  {
    to: '/scan',
    title: 'Photo scan',
    text: 'Webcam or upload—demo model + informal warmth signal.',
  },
  {
    to: '/learn',
    title: 'Sun exposure & cancer awareness',
    text: 'How UV adds up and why protection matters long-term.',
  },
] as const

const planIdeas = [
  { id: 'midday', label: 'Avoid peak UV window', hint: 'Schedule shade or indoor breaks around your peak hour.' },
  { id: 'spf', label: 'SPF + reapply', hint: 'Every ~2h outside; more if swimming or sweating.' },
  { id: 'layers', label: 'Hat & sleeves', hint: 'Clothing beats forgetting to reapply sunscreen.' },
] as const

export function HomePage() {
  const { uvCoords, uvPlaceLabel } = useSunCheck()

  const [planOpen, setPlanOpen] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [plan, setPlan] = useState<TodayUvPlan | null>(null)
  const [weatherOverview, setWeatherOverview] = useState<Awaited<
    ReturnType<typeof fetchTodayWeatherOverview>
  >>(null)
  const [pickedIdeas, setPickedIdeas] = useState<Set<string>>(() => new Set())

  const runPlanForCoords = useCallback(async (lat: number, lon: number) => {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const [uvResult, wxResult] = await Promise.allSettled([
        fetchTodayUvPlan(lat, lon),
        fetchTodayWeatherOverview(lat, lon),
      ])
      if (uvResult.status === 'rejected') {
        throw uvResult.reason
      }
      setPlan(uvResult.value)
      setWeatherOverview(
        wxResult.status === 'fulfilled' ? wxResult.value : null,
      )
    } catch (e) {
      setPlan(null)
      setWeatherOverview(null)
      setPlanError(e instanceof Error ? e.message : 'Could not load today’s UV plan.')
    } finally {
      setPlanLoading(false)
    }
  }, [])

  const planWithGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPlanError('Geolocation is not available in this browser.')
      return
    }
    setPlanOpen(true)
    setPlanLoading(true)
    setPlanError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void runPlanForCoords(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setPlanLoading(false)
        setPlanError(
          err.code === 1
            ? 'Location denied. Use the UV tab to enter city and state, then “Plan with saved spot” below.'
            : 'Could not read your location.',
        )
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    )
  }, [runPlanForCoords])

  const planWithSavedCoords = useCallback(() => {
    if (!uvCoords) return
    setPlanOpen(true)
    void runPlanForCoords(uvCoords.lat, uvCoords.lon)
  }, [uvCoords, runPlanForCoords])

  const toggleIdea = (id: string) => {
    setPickedIdeas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const peakTips = plan?.peak ? uvGuidance(plan.peak.uv) : null

  const stripPoints =
    plan && plan.restOfDay.length > 0
      ? plan.restOfDay
      : plan?.hourly.slice(-12) ?? []

  return (
    <div className="page home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <h2 id="home-hero-title" className="home-hero-title">
          Plan around the sun
        </h2>
        <p className="home-hero-sub">
          See when <strong>UV peaks today</strong>, skim the rest of the day, and stack habits—not
          medical advice, just smarter timing.
        </p>
        <div className="home-hero-actions">
          <button
            type="button"
            className="btn btn-primary home-hero-cta"
            onClick={() => planWithGeolocation()}
            disabled={planLoading}
          >
            {planLoading ? 'Loading your day…' : 'Plan your day'}
          </button>
          <Link to="/uv" className="btn btn-ghost home-hero-secondary">
            Full UV &amp; alerts
          </Link>
        </div>
        {uvCoords && (
          <p className="home-saved-loc">
            <button
              type="button"
              className="home-linkish"
              onClick={() => planWithSavedCoords()}
              disabled={planLoading}
            >
              Plan with saved spot
            </button>
            <span className="home-saved-meta">
              {' '}
              (
              {uvPlaceLabel
                ? `${uvPlaceLabel} (${uvCoords.lat.toFixed(2)}°, ${uvCoords.lon.toFixed(2)}°)`
                : `${uvCoords.lat.toFixed(2)}°, ${uvCoords.lon.toFixed(2)}°`}
              {' · from UV tab'})
            </span>
          </p>
        )}
        {planError && <p className="status error home-plan-error">{planError}</p>}
      </section>

      {planOpen && (
        <section className="home-plan-panel" aria-labelledby="plan-panel-title">
          <h3 id="plan-panel-title" className="home-plan-title">
            Today&apos;s UV shape
          </h3>
          {planLoading && <p className="status">Crunching hourly UV…</p>}
          {!planLoading && plan && plan.peak && (
            <>
              <div className={`home-peak-card accent-${peakTips?.accent ?? 'moderate'}`}>
                <p className="home-peak-label">Peak UV today</p>
                <p className="home-peak-time">{plan.peak.label}</p>
                <p className="home-peak-uv">
                  index <strong>{plan.peak.uv.toFixed(1)}</strong>
                </p>
                <p className="home-peak-tip">
                  {peakTips?.summary ?? 'Limit unprotected sun around this window when you can.'}
                </p>
              </div>

              <div className="home-strip-wrap">
                <p className="home-strip-label">Rest of today (hourly)</p>
                <ul className="home-uv-strip" aria-label="UV index by hour for the rest of today">
                  {stripPoints.slice(0, 14).map((p) => (
                    <li key={p.at.toISOString()} className="home-uv-chip">
                      <span className="home-uv-chip-time">{p.label}</span>
                      <span className="home-uv-chip-val">{p.uv.toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="home-weather-card">
            <p className="home-weather-title">Weather</p>
            {isWeatherApiConfigured() && weatherOverview ? (
              <div className="home-weather-split">
                <div className="home-weather-col home-weather-col--today">
                  <p className="home-weather-col-title">Now</p>
                  <div className="home-weather-overview">
                    <div className="home-weather-current" aria-label="Current temperature">
                      <span className="home-weather-current-val">
                        {Math.round(weatherOverview.currentTempF)}
                      </span>
                      <span className="home-weather-current-unit">°F</span>
                    </div>
                    <p
                      className="home-weather-hilo"
                      aria-label={`Today high ${Math.round(weatherOverview.highTempF)}°F, low ${Math.round(weatherOverview.lowTempF)}°F`}
                    >
                      <span className="home-weather-hilo-item">
                        <span className="home-weather-hilo-label">H</span>
                        {Math.round(weatherOverview.highTempF)}°
                      </span>
                      <span className="home-weather-hilo-sep" aria-hidden>
                        ·
                      </span>
                      <span className="home-weather-hilo-item">
                        <span className="home-weather-hilo-label">L</span>
                        {Math.round(weatherOverview.lowTempF)}°
                      </span>
                    </p>
                    <p className="home-weather-condition">{weatherOverview.conditionText}</p>
                  </div>
                </div>
                <div className="home-weather-col home-weather-col--week">
                  <p className="home-weather-col-title">Next 7 days</p>
                  <ul className="home-weather-week" aria-label="Daily high and low for the week">
                    {weatherOverview.week.map((d) => (
                      <li key={d.date} className="home-weather-week-row">
                        <span className="home-weather-week-day">{d.label}</span>
                        <span className="home-weather-week-temps" aria-label={`High ${Math.round(d.highTempF)}°F, low ${Math.round(d.lowTempF)}°F`}>
                          <span className="home-weather-week-hi">{Math.round(d.highTempF)}°</span>
                          <span className="home-weather-week-lo">{Math.round(d.lowTempF)}°</span>
                        </span>
                        <span className="home-weather-week-sum" title={d.conditionText}>
                          {d.conditionText}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="status home-weather-placeholder">
                {isWeatherApiConfigured()
                  ? 'Couldn’t load weather for this location. Check your API key or try again.'
                  : 'Add your WeatherAPI.com key as VITE_WEATHER_API_KEY in .env.local (see src/api/weather.ts).'}
              </p>
            )}
          </div>

          <div className="home-checklist">
            <p className="home-checklist-title">Tap what you&apos;re committing to today</p>
            <ul className="home-checklist-items">
              {planIdeas.map((idea) => (
                <li key={idea.id}>
                  <button
                    type="button"
                    className={`home-check-item ${pickedIdeas.has(idea.id) ? 'is-on' : ''}`}
                    onClick={() => toggleIdea(idea.id)}
                    aria-pressed={pickedIdeas.has(idea.id)}
                  >
                    <span className="home-check-bubble" aria-hidden>
                      {pickedIdeas.has(idea.id) ? '✓' : ''}
                    </span>
                    <span className="home-check-text">
                      <strong>{idea.label}</strong>
                      <span className="home-check-hint">{idea.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn btn-ghost home-plan-collapse"
            onClick={() => setPlanOpen(false)}
          >
            Collapse planner
          </button>
        </section>
      )}

      <p className="home-lead">
        Live <strong>UV index</strong> and <strong>burn alerts</strong>, optional{' '}
        <strong>photo processing</strong>, and <strong>education</strong> on sun exposure
        and skin cancer risk—built for safer habits, not to replace medical care.
      </p>

      <ul className="home-cards">
        {featureCards.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="home-card">
              <span className="home-card-title">{c.title}</span>
              <span className="home-card-text">{c.text}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="home-hint">
        Use the tabs above anytime. Load UV on the{' '}
        <Link to="/uv">UV</Link> tab to sync burn alerts; your last place can power{' '}
        <strong>Plan with saved spot</strong> here.
      </p>
    </div>
  )
}
