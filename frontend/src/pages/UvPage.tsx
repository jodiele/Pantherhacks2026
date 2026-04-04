import { BurnAlertCard } from '../components/BurnAlertCard'
import { useSunCheck } from '../context/SunCheckContext'
import { burnAlertsForUv, uvGuidance } from '../sunburn'

export function UvPage() {
  const {
    uvIndex,
    uvCoords,
    uvPlaceLabel,
    uvLoading,
    uvError,
    manualCity,
    setManualCity,
    manualState,
    setManualState,
    refreshUvFromLocation,
    applyCityStatePlace,
  } = useSunCheck()

  const uvTips = uvIndex !== null ? uvGuidance(uvIndex) : null
  const liveBurnAlerts = uvIndex !== null ? burnAlertsForUv(uvIndex) : []

  return (
    <div className="page">
      <section className="section section--page" aria-labelledby="uv-heading">
        <h2 id="uv-heading" className="section-title">
          UV index near you
        </h2>
        <p className="section-lead">
          Live estimate from{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          . Places are looked up with{' '}
          <a
            href="https://open-meteo.com/en/docs/geocoding-api"
            target="_blank"
            rel="noreferrer"
          >
            their geocoder
          </a>
          . Refresh when you change location.
        </p>

        <div className="panel uv-panel">
          <div className="uv-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => refreshUvFromLocation()}
              disabled={uvLoading}
            >
              {uvLoading ? 'Loading…' : 'Use my location'}
            </button>
          </div>

          <div className="manual-coords manual-place">
            <span className="manual-label">Or enter city &amp; state</span>
            <p className="manual-place-hint">
              State helps pick the right city (e.g. Portland <strong>OR</strong> vs{' '}
              <strong>ME</strong>). Use two-letter code or full name.
            </p>
            <div className="manual-row manual-row--place">
              <label className="sr-only" htmlFor="uv-city">
                City
              </label>
              <input
                id="uv-city"
                className="coord-input place-input place-input--city"
                type="text"
                autoComplete="address-level2"
                placeholder="City (e.g. Austin)"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
              />
              <label className="sr-only" htmlFor="uv-state">
                State
              </label>
              <input
                id="uv-state"
                className="coord-input place-input place-input--state"
                type="text"
                autoComplete="address-level1"
                placeholder="State (e.g. TX)"
                value={manualState}
                onChange={(e) => setManualState(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void applyCityStatePlace()}
                disabled={uvLoading}
              >
                Get UV
              </button>
            </div>
          </div>

          {uvError && <p className="status error">{uvError}</p>}

          {uvIndex !== null && uvTips && (
            <div className={`uv-result accent-${uvTips.accent}`}>
              <div className="uv-meter">
                <span className="uv-value" aria-live="polite">
                  {uvIndex.toFixed(1)}
                </span>
                <span className="uv-unit">UV index</span>
              </div>
              <div className="uv-meta">
                <p className="uv-band">{uvTips.band} exposure</p>
                {uvCoords ? (
                  <p className="uv-loc">
                    {uvPlaceLabel ? (
                      <>
                        {uvPlaceLabel}{' '}
                        <span className="uv-loc-coords">
                          ({uvCoords.lat.toFixed(2)}°, {uvCoords.lon.toFixed(2)}°)
                        </span>
                      </>
                    ) : (
                      <>
                        {uvCoords.lat.toFixed(2)}°, {uvCoords.lon.toFixed(2)}°
                      </>
                    )}
                  </p>
                ) : null}
                <p className="uv-summary">{uvTips.summary}</p>
                <ul className="tip-list">
                  {uvTips.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section section--page" aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="section-title">
          Burn alerts
        </h2>
        <p className="section-lead">
          Alerts react to the <strong>current UV index</strong> for your location. Photo warmth
          alerts appear on the <strong>Photo scan</strong> tab after you run a scan.
        </p>
        <div className="burn-alert-stack">
          {uvIndex === null ? (
            <BurnAlertCard
              alert={{
                level: 'info',
                headline: 'Load UV to unlock live burn alerts',
                body: 'Use “Use my location” or enter city and state above.',
              }}
            />
          ) : (
            liveBurnAlerts.map((a, i) => <BurnAlertCard key={i} alert={a} />)
          )}
        </div>
      </section>
    </div>
  )
}
