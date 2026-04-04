import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import './App.css'
import {
  CANCER_AWARENESS_INTRO,
  CANCER_AWARENESS_POINTS,
  CANCER_RESOURCES,
  SUNBURN_CARE,
  SUN_EXPOSURE_POINTS,
  WHEN_TO_SEEK_CARE,
  burnAlertsForUv,
  estimateWarmthSignal,
  fetchCurrentUv,
  uvGuidance,
  warmthPhotoBurnNotice,
  type BurnAlert,
} from './sunburn'

type PredictOk = {
  label: string
  confidence: number
  scores: Record<string, number>
  filename?: string
}

function formatLabel(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function predictImage(file: File): Promise<PredictOk> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/predict', {
    method: 'POST',
    body,
  })
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(
      `Empty response (HTTP ${res.status}). Start the Flask API on port 5000: python run.py`,
    )
  }
  let data: PredictOk & { error?: string }
  try {
    data = JSON.parse(trimmed) as PredictOk & { error?: string }
  } catch {
    throw new Error(
      `Server did not return JSON (HTTP ${res.status}). ${trimmed.slice(0, 100)}${trimmed.length > 100 ? '…' : ''}`,
    )
  }
  if (!res.ok || ('error' in data && data.error)) {
    throw new Error(
      typeof data === 'object' && data && 'error' in data && data.error
        ? data.error
        : 'Request failed',
    )
  }
  return data as PredictOk
}

function topScores(scores: Record<string, number>, n = 5) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

function parseCoord(raw: string, min: number, max: number): number | null {
  const v = Number.parseFloat(raw.trim())
  if (Number.isNaN(v) || v < min || v > max) return null
  return v
}

function BurnAlertCard({ alert }: { alert: BurnAlert }) {
  return (
    <div
      className={`burn-alert burn-alert--${alert.level}`}
      role="status"
    >
      <p className="burn-alert-head">{alert.headline}</p>
      <p className="burn-alert-body">{alert.body}</p>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [camReady, setCamReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictOk | null>(null)
  const [warmthSignal, setWarmthSignal] = useState<number | null>(null)

  const [uvIndex, setUvIndex] = useState<number | null>(null)
  const [uvCoords, setUvCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [uvLoading, setUvLoading] = useState(false)
  const [uvError, setUvError] = useState<string | null>(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLon, setManualLon] = useState('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play()
        setCamReady(true)
      }
    } catch (e) {
      setCameraError(
        e instanceof Error
          ? e.message
          : 'Could not access the camera. Allow permission or use upload instead.',
      )
    }
  }, [stopCamera])

  useEffect(() => {
    if (mode === 'camera') {
      void startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [mode, startCamera, stopCamera])

  const loadUvForCoords = async (lat: number, lon: number) => {
    setUvLoading(true)
    setUvError(null)
    try {
      const uv = await fetchCurrentUv(lat, lon)
      setUvIndex(uv)
      setUvCoords({ lat, lon })
    } catch (e) {
      setUvError(e instanceof Error ? e.message : 'Could not load UV index.')
      setUvIndex(null)
    } finally {
      setUvLoading(false)
    }
  }

  const refreshUvFromLocation = () => {
    if (!navigator.geolocation) {
      setUvError('Geolocation is not available in this browser.')
      return
    }
    setUvLoading(true)
    setUvError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadUvForCoords(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setUvLoading(false)
        setUvError(
          err.code === 1
            ? 'Location permission denied. Enter coordinates below or enable location.'
            : 'Could not read your location.',
        )
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    )
  }

  const applyManualCoords = () => {
    const lat = parseCoord(manualLat, -90, 90)
    const lon = parseCoord(manualLon, -180, 180)
    if (lat === null || lon === null) {
      setUvError('Enter valid latitude (−90–90) and longitude (−180–180).')
      return
    }
    void loadUvForCoords(lat, lon)
  }

  const runPredict = async (file: File) => {
    setLoading(true)
    setScanError(null)
    setResult(null)
    setWarmthSignal(null)
    try {
      const data = await predictImage(file)
      setResult(data)
      try {
        setWarmthSignal(await estimateWarmthSignal(file))
      } catch {
        setWarmthSignal(null)
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !camReady) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setScanError('Video not ready yet.')
      return
    }

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) {
      setScanError('Could not capture image.')
      return
    }

    const prev = previewUrl
    if (prev) URL.revokeObjectURL(prev)
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    setUploadFile(null)

    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
    await runPredict(file)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setScanError(null)
    setResult(null)
    setWarmthSignal(null)
    setUploadFile(f)
    const prev = previewUrl
    if (prev) URL.revokeObjectURL(prev)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const analyzeUpload = async () => {
    if (!uploadFile) return
    await runPredict(uploadFile)
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const scores = result?.scores ? topScores(result.scores) : []
  const uvTips = uvIndex !== null ? uvGuidance(uvIndex) : null
  const liveBurnAlerts = uvIndex !== null ? burnAlertsForUv(uvIndex) : []
  const warmthBurnAlert =
    result !== null && warmthSignal !== null
      ? warmthPhotoBurnNotice(warmthSignal)
      : null

  return (
    <div className="app">
      <div className="disclaimer">
        <strong>Not medical advice.</strong> SunCheck shares UV-based burn alerts, informal
        photo hints, and cancer-risk education for awareness only. It does not diagnose
        sunburn, skin cancer, or any disease—see a qualified clinician for evaluation.
      </div>

      <div className="shell">
        <header className="brand">
          <p className="tagline">Hackathon · sunburn help · UV · photo scan · awareness</p>
          <h1>SunCheck</h1>
          <p>
            Live <strong>UV index</strong> and <strong>burn alerts</strong> for your
            location, optional <strong>photo processing</strong> for demo signals, plus{' '}
            <strong>sun exposure</strong> context and <strong>skin cancer awareness</strong>.
            Built to support safer habits—not to replace medical care.
          </p>
        </header>

        <section className="section" aria-labelledby="uv-heading">
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

        <section className="section" aria-labelledby="alerts-heading">
          <h2 id="alerts-heading" className="section-title">
            Burn alerts
          </h2>
          <p className="section-lead">
            Alerts below react to the <strong>current UV index</strong> for your coordinates.
            After a photo scan, an extra <strong>demo</strong> warmth alert may appear in your
            results—still not a medical diagnosis.
          </p>
          <div className="burn-alert-stack">
            {uvIndex === null ? (
              <BurnAlertCard
                alert={{
                  level: 'info',
                  headline: 'Load UV to unlock live burn alerts',
                  body: 'Use “Use my location” or enter latitude and longitude above. Alerts will reflect how quickly unprotected skin can burn in your area right now.',
                }}
              />
            ) : (
              liveBurnAlerts.map((a, i) => <BurnAlertCard key={i} alert={a} />)
            )}
          </div>
        </section>

        <section className="section" aria-labelledby="scan-heading">
          <h2 id="scan-heading" className="section-title">
            Photo scan (demo model)
          </h2>
          <p className="section-lead">
            The backend still runs the same research classifier on your image. We also show a
            simple color-based “warmth” signal from the photo—informal only, not a burn
            detector.
          </p>

          <div className="mode-tabs">
            <button
              type="button"
              className={mode === 'camera' ? 'active' : ''}
              onClick={() => setMode('camera')}
            >
              Webcam
            </button>
            <button
              type="button"
              className={mode === 'upload' ? 'active' : ''}
              onClick={() => setMode('upload')}
            >
              Upload file
            </button>
          </div>

          {mode === 'camera' && (
            <div className="panel">
              <div className="video-wrap">
                <video ref={videoRef} playsInline muted />
                {!camReady && !cameraError && (
                  <div className="video-placeholder">Starting camera…</div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {cameraError && <p className="status error">{cameraError}</p>}
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void capturePhoto()}
                  disabled={!camReady || loading}
                >
                  {loading ? 'Analyzing…' : 'Capture & analyze'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void startCamera()}
                  disabled={loading}
                >
                  Restart camera
                </button>
              </div>
              {previewUrl && (
                <div className="preview-row">
                  <img src={previewUrl} alt="Last capture" />
                </div>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <div className="panel">
              <label className="upload-zone">
                <input
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />
                <div>
                  Drop an image here or <strong>browse</strong>
                  <br />
                  <span className="status">Well-lit, steady photos work best</span>
                </div>
              </label>
              {previewUrl && uploadFile && (
                <div className="preview-row">
                  <img src={previewUrl} alt="Preview" />
                  <div className="actions" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void analyzeUpload()}
                      disabled={loading}
                    >
                      {loading ? 'Analyzing…' : 'Analyze image'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {scanError && <p className="status error">{scanError}</p>}

          {result && (
            <div className="result-stack">
              {warmthBurnAlert && <BurnAlertCard alert={warmthBurnAlert} />}
              {warmthSignal !== null && (
                <div className="result-card warmth-card">
                  <h2>Warmth signal (demo)</h2>
                  <p className="warmth-bar-wrap">
                    <span
                      className="warmth-bar"
                      style={{ width: `${Math.round(warmthSignal * 100)}%` }}
                    />
                  </p>
                  <p className="warmth-caption">
                    Informal red-channel hint: {Math.round(warmthSignal * 100)}% — not a
                    clinical measure of sunburn.
                  </p>
                </div>
              )}

              <div className="result-card">
                <h2>Model pattern match</h2>
                <p className="prediction-main">{formatLabel(result.label)}</p>
                <p className="confidence">
                  Confidence {Math.round(result.confidence * 1000) / 10}%
                </p>
                <p className="model-note">
                  Trained labels are not specific to sunburn. Use this only as a hackathon
                  demo alongside UV and real medical guidance.
                </p>
                <ul className="score-list">
                  {scores.map(([name, val]) => (
                    <li key={name}>
                      <div className="score-row">
                        <span>{formatLabel(name)}</span>
                        <span>{Math.round(val * 1000) / 10}%</span>
                      </div>
                      <div className="bar">
                        <div className="bar-fill" style={{ width: `${val * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="result-card care-card">
                <h2>If skin feels burned</h2>
                <ul className="tip-list">
                  {SUNBURN_CARE.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="urgent-care">{WHEN_TO_SEEK_CARE}</p>
              </div>
            </div>
          )}
        </section>

        <section className="section" aria-labelledby="exposure-heading">
          <h2 id="exposure-heading" className="section-title">
            Sun exposure
          </h2>
          <p className="section-lead">
            Short sessions add up. Thinking in <strong>doses</strong> of UV—not just “did I
            burn today?”—helps protect skin over years.
          </p>
          <div className="panel education-panel">
            <ul className="education-list">
              {SUN_EXPOSURE_POINTS.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" aria-labelledby="cancer-heading">
          <h2 id="cancer-heading" className="section-title">
            UV, sunburn, and skin cancer awareness
          </h2>
          <p className="section-lead">
            Most skin cancers are linked to UV damage. Sunburns are a clear warning sign, but{' '}
            <strong>cumulative exposure</strong> matters even without a painful burn.
          </p>
          <div className="panel awareness-panel">
            <p className="awareness-intro">{CANCER_AWARENESS_INTRO}</p>
            <ul className="tip-list awareness-bullets">
              {CANCER_AWARENESS_POINTS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="resources-label">Trusted references</p>
            <ul className="resource-links">
              {CANCER_RESOURCES.map((r) => (
                <li key={r.href}>
                  <a href={r.href} target="_blank" rel="noreferrer">
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <footer className="foot">
        UV: Open-Meteo · Image API: Flask + PyTorch · UI: Vite + React · Education only
      </footer>
    </div>
  )
}
