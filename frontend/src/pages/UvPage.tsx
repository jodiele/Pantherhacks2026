import { BurnAlertCard } from '../components/BurnAlertCard'
import { useSunCheck } from '../context/SunCheckContext'
import { burnAlertsForUv, uvGuidance } from '../sunburn'

export function UvPage() {
  const {
    uvIndex,
    uvCoords,
    uvLoading,
    uvError,
    manualLat,
    setManualLat,
    manualLon,
    setManualLon,
    refreshUvFromLocation,
    applyManualCoords,
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

          <div className="manual-coords">
            <span className="manual-label">Or enter coordinates</span>
            <div className="manual-row">
              <label className="sr-only" htmlFor="lat">
                Latitude
              </label>
              <input
                id="lat"
                className="coord-input"
                inputMode="decimal"
                placeholder="Latitude (e.g. 37.77)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <label className="sr-only" htmlFor="lon">
                Longitude
              </label>
              <input
                id="lon"
                className="coord-input"
                inputMode="decimal"
                placeholder="Longitude (e.g. -122.42)"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => applyManualCoords()}
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
                {uvCoords && (
                  <p className="uv-loc">
                    {uvCoords.lat.toFixed(2)}°, {uvCoords.lon.toFixed(2)}°
                  </p>
                )}
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
          Alerts react to the <strong>current UV index</strong> for your coordinates. Photo
          warmth alerts appear on the <strong>Photo scan</strong> tab after you run a scan.
        </p>
        <div className="burn-alert-stack">
          {uvIndex === null ? (
            <BurnAlertCard
              alert={{
                level: 'info',
                headline: 'Load UV to unlock live burn alerts',
                body: 'Use “Use my location” or enter latitude and longitude above.',
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
