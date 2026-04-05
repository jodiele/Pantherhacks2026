import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTodayWeatherOverview, isWeatherApiConfigured } from '@/api/weather'
import { useSuntology } from '@/context/SuntologyContext'
import { buildTodayVibe } from '@/lib/homeHeroCopy'
import { UvHourlyChart } from '@/components/UvHourlyChart'
import { fetchTodayUvPlan, type TodayUvPlan, uvGuidance } from '@/sunburn'

const planHeroTips = [
  {
    id: 'why-peak',
    label: 'Why peak UV matters',
    detail:
      'Skin stress adds up over years. The strongest hours are when unprotected burns and DNA damage happen fastest—timing shade and SPF around the peak is free leverage.',
  },
] as const

export function DayPlanSection() {
  const { uvCoords, uvPlaceLabel } = useSuntology()

  const [expandedHeroTip, setExpandedHeroTip] = useState<string | null>(null)
  const [locationNotice, setLocationNotice] = useState(false)

  const [planAnimSeq, setPlanAnimSeq] = useState(0)
  const wasPlanLoading = useRef(false)

  const [planOpen, setPlanOpen] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [plan, setPlan] = useState<TodayUvPlan | null>(null)
  const [weatherOverview, setWeatherOverview] = useState<Awaited<
    ReturnType<typeof fetchTodayWeatherOverview>
  >>(null)

  useLayoutEffect(() => {
    if (planOpen && wasPlanLoading.current && !planLoading) {
      setPlanAnimSeq((n) => n + 1)
    }
    wasPlanLoading.current = planLoading
  }, [planOpen, planLoading])

  const runPlanForCoords = useCallback(async (lat: number, lon: number) => {
    setPlanLoading(true)
    setPlanError(null)
    setLocationNotice(false)
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

  const planWithSavedCoords = useCallback(() => {
    if (!uvCoords) return
    setPlanOpen(true)
    void runPlanForCoords(uvCoords.lat, uvCoords.lon)
  }, [uvCoords, runPlanForCoords])

  function handleHeroPlanClick() {
    setPlanError(null)
    if (!uvCoords) {
      setLocationNotice(true)
      document.getElementById('uv-heading')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }
    planWithSavedCoords()
  }

  const peakTips = plan?.peak ? uvGuidance(plan.peak.uv) : null

  return (
    <section
      className="section section--page uv-day-plan-section"
      aria-labelledby="uv-plan-around-title"
    >
      <div className="home-hero uv-plan-hero">
        <h2 id="uv-plan-around-title" className="home-hero-title">
          Pla Around the Sun
        </h2>
        <p className="home-hero-sub">
          See when <strong>UV peaks today</strong>, view the full-day curve with a &ldquo;now&rdquo;
          marker, and check local weather.
        </p>
        <ul className="home-hero-tips" aria-label="Quick tips—tap to expand">
          {planHeroTips.map((tip) => {
            const open = expandedHeroTip === tip.id
            return (
              <li key={tip.id} className="home-hero-tip-item">
                <button
                  type="button"
                  className={`home-hero-tip-btn ${open ? 'is-open' : ''}`}
                  aria-expanded={open}
                  aria-controls={`uv-plan-tip-${tip.id}`}
                  id={`uv-plan-tip-trigger-${tip.id}`}
                  onClick={() =>
                    setExpandedHeroTip((cur) => (cur === tip.id ? null : tip.id))
                  }
                >
                  <span className="home-hero-tip-chevron" aria-hidden>
                    {open ? '▼' : '▶'}
                  </span>
                  {tip.label}
                </button>
                <div
                  id={`uv-plan-tip-${tip.id}`}
                  role="region"
                  aria-labelledby={`uv-plan-tip-trigger-${tip.id}`}
                  aria-hidden={!open}
                  className={`home-hero-tip-panel ${open ? 'is-open' : ''}`}
                >
                  <div className="home-hero-tip-panel-inner">
                    <p className="home-hero-tip-detail">{tip.detail}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="home-hero-actions">
          <button
            type="button"
            className="btn btn-primary home-hero-cta"
            onClick={handleHeroPlanClick}
            disabled={planLoading}
          >
            {planLoading ? 'Loading your day…' : 'Plan your day'}
          </button>
          <Link to="/learn" className="btn btn-ghost home-hero-secondary">
            Sun &amp; skin basics
          </Link>
        </div>
      </div>

      {uvCoords ? (
        <p className="uv-plan-saved-meta">
          Saved spot:{' '}
          {uvPlaceLabel
            ? `${uvPlaceLabel} (${uvCoords.lat.toFixed(2)}°, ${uvCoords.lon.toFixed(2)}°)`
            : `${uvCoords.lat.toFixed(2)}°, ${uvCoords.lon.toFixed(2)}°`}
        </p>
      ) : (
        <p className="status uv-plan-hint">
          Set your location with <strong>Use my location</strong> or city &amp; state above, then
          tap <strong>Plan your day</strong>.
        </p>
      )}

      {locationNotice && (
        <p className="status uv-plan-location-notice" role="status">
          Choose a location in the UV section above first—we&apos;ll scroll you there.
        </p>
      )}

      {planError && <p className="status error home-plan-error">{planError}</p>}

      {planOpen && (
        <div className="home-plan-panel uv-plan-panel" aria-labelledby="plan-panel-title">
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

              <p className="home-vibe" aria-live="polite">
                {buildTodayVibe(
                  plan.peak.uv,
                  plan.peak.label,
                  weatherOverview?.conditionText ?? null,
                )}
              </p>

              <div
                key={`strip-${planAnimSeq}`}
                className="home-strip-wrap home-animate-in"
              >
                <p className="home-strip-label">Today&apos;s UV (full day)</p>
                <UvHourlyChart points={plan.hourly} nowAt={new Date()} />
              </div>
            </>
          )}

          <div
            key={`wx-${planAnimSeq}`}
            className={`home-weather-card${planAnimSeq > 0 ? ' home-animate-in home-animate-in--delay' : ''}`}
          >
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
                        <span
                          className="home-weather-week-temps"
                          aria-label={`High ${Math.round(d.highTempF)}°F, low ${Math.round(d.lowTempF)}°F`}
                        >
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

          <p className="home-plan-foot">
            Photo warmth alerts show on{' '}
            <Link to="/scan">Photo scan</Link> after you run a scan. For how UV adds up over time,{' '}
            <Link to="/learn">Sun &amp; skin basics</Link>.
          </p>

          <button
            type="button"
            className="btn btn-ghost home-plan-collapse"
            onClick={() => setPlanOpen(false)}
          >
            Collapse planner
          </button>
        </div>
      )}
    </section>
  )
}
