import type { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createFaceLandmarker } from '../lib/createFaceLandmarker'
import { createHandLandmarker } from '../lib/createHandLandmarker'
import {
  COVERAGE_OVAL,
  hitTestZone,
  INDEX_FINGER_TIP,
  initialCoverage,
  normalizedTipToViewBox,
  type ZoneId,
  ZONE_CATEGORIES,
  ZONES,
  zoneById,
} from '../lib/coverageZones'
import {
  boundsToFittedOval,
  contourLandmarksToCanonicalPoints,
  DEFAULT_FITTED_FACE_OVAL,
  faceShapeToInnerSvgTransform,
  inverseFaceShapeWarp,
  lerpFittedOval,
  lerpFittedOvalTowardDefault,
} from '../lib/faceShapeOval'
import {
  computeFaceOverlayTargets,
  faceOverlayToSvgTransform,
  isNearIdentity,
  lerpFaceOverlay,
  lerpFaceTowardIdentity,
  TEMPLATE_ANCHOR,
  type FaceOverlaySmooth,
  viewBoxGlobalToZoneLocal,
} from '../lib/faceOverlayTransform'

/** Cumulative finger travel (viewBox units) in a zone before it counts as covered. */
const RUB_TRAVEL_TO_COVER = 50
const MIN_STEP = 0.06
const MAX_STEP = 22

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

const IDENTITY_FACE: FaceOverlaySmooth = {
  noseX: TEMPLATE_ANCHOR.x,
  noseY: TEMPLATE_ANCHOR.y,
  rotDeg: 0,
  scale: 1,
}

export function CoveragePage() {
  const ovalClipId = useId().replace(/\W/g, '')
  const videoRef = useRef<HTMLVideoElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const handLmRef = useRef<HandLandmarker | null>(null)
  const faceLmRef = useRef<FaceLandmarker | null>(null)
  const coveredRef = useRef(initialCoverage())
  const rubByZoneRef = useRef<Partial<Record<ZoneId, number>>>({})
  const prevTipsRef = useRef<Map<number, { vx: number; vy: number }>>(new Map())
  const smoothFaceRef = useRef<FaceOverlaySmooth>({ ...IDENTITY_FACE })
  const smoothShapeRef = useRef({ ...DEFAULT_FITTED_FACE_OVAL })
  const lastSvgTransformRef = useRef<string | null>(null)
  const lastInnerShapeRef = useRef(faceShapeToInnerSvgTransform(DEFAULT_FITTED_FACE_OVAL))

  const [camReady, setCamReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [covered, setCovered] = useState(initialCoverage)
  const [handTracking, setHandTracking] = useState(true)
  const [faceTracking, setFaceTracking] = useState(true)
  const [handStatus, setHandStatus] = useState<ModelStatus>('idle')
  const [faceStatus, setFaceStatus] = useState<ModelStatus>('idle')
  const [svgTransform, setSvgTransform] = useState<string | null>(null)
  const [innerShapeTransform, setInnerShapeTransform] = useState(() =>
    faceShapeToInnerSvgTransform(DEFAULT_FITTED_FACE_OVAL),
  )
  const [fingerPct, setFingerPct] = useState<{ x: number; y: number } | null>(
    null,
  )

  useEffect(() => {
    coveredRef.current = covered
  }, [covered])

  const stopStream = useCallback(() => {
    const v = videoRef.current
    const stream = v?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (v) v.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCamReady(false)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      await v.play()
      setCamReady(true)
    } catch {
      setCameraError('Camera permission denied or unavailable.')
    }
  }, [stopStream])

  useEffect(() => {
    void startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

  useEffect(() => {
    if (!camReady || !handTracking) {
      setHandStatus('idle')
      handLmRef.current?.close()
      handLmRef.current = null
      return
    }

    let cancelled = false
    setHandStatus('loading')

    ;(async () => {
      try {
        const lm = await createHandLandmarker()
        if (cancelled) {
          lm.close()
          return
        }
        handLmRef.current = lm
        setHandStatus('ready')
      } catch {
        if (!cancelled) setHandStatus('error')
      }
    })()

    return () => {
      cancelled = true
      handLmRef.current?.close()
      handLmRef.current = null
    }
  }, [camReady, handTracking])

  useEffect(() => {
    if (!camReady || !faceTracking) {
      setFaceStatus('idle')
      faceLmRef.current?.close()
      faceLmRef.current = null
      smoothFaceRef.current = { ...IDENTITY_FACE }
      smoothShapeRef.current = { ...DEFAULT_FITTED_FACE_OVAL }
      setSvgTransform(null)
      lastSvgTransformRef.current = null
      const innerT = faceShapeToInnerSvgTransform(DEFAULT_FITTED_FACE_OVAL)
      lastInnerShapeRef.current = innerT
      setInnerShapeTransform(innerT)
      return
    }

    let cancelled = false
    setFaceStatus('loading')

    ;(async () => {
      try {
        const lm = await createFaceLandmarker()
        if (cancelled) {
          lm.close()
          return
        }
        faceLmRef.current = lm
        setFaceStatus('ready')
      } catch {
        if (!cancelled) setFaceStatus('error')
      }
    })()

    return () => {
      cancelled = true
      faceLmRef.current?.close()
      faceLmRef.current = null
    }
  }, [camReady, faceTracking])

  const canRunFace = faceTracking && faceStatus === 'ready'
  const canRunHand = handTracking && handStatus === 'ready'
  const runLoop = camReady && (canRunFace || canRunHand)

  useEffect(() => {
    if (!runLoop) {
      setFingerPct(null)
      lastSvgTransformRef.current = null
      setSvgTransform(null)
      const innerT = faceShapeToInnerSvgTransform(DEFAULT_FITTED_FACE_OVAL)
      lastInnerShapeRef.current = innerT
      setInnerShapeTransform(innerT)
      return
    }

    let alive = true

    const globalToCanonical = (gx: number, gy: number) => {
      const sFace = smoothFaceRef.current
      let midX = gx
      let midY = gy
      if (canRunFace && !isNearIdentity(sFace)) {
        const m = viewBoxGlobalToZoneLocal(
          gx,
          gy,
          { x: sFace.noseX, y: sFace.noseY },
          sFace.rotDeg,
          sFace.scale,
          TEMPLATE_ANCHOR,
        )
        midX = m.vx
        midY = m.vy
      }
      if (!faceTracking) {
        return { vx: midX, vy: midY }
      }
      return inverseFaceShapeWarp(midX, midY, smoothShapeRef.current)
    }

    const setTransformIfChanged = (next: string | null) => {
      if (next !== lastSvgTransformRef.current) {
        lastSvgTransformRef.current = next
        setSvgTransform(next)
      }
    }

    const setInnerShapeIfChanged = (next: string) => {
      if (next !== lastInnerShapeRef.current) {
        lastInnerShapeRef.current = next
        setInnerShapeTransform(next)
      }
    }

    const tick = () => {
      if (!alive) return

      const video = videoRef.current
      const feed = feedRef.current

      if (!video || !feed || video.readyState < 2) {
        requestAnimationFrame(tick)
        return
      }

      const vw = video.videoWidth
      const vh = video.videoHeight
      if (vw < 16 || vh < 16) {
        requestAnimationFrame(tick)
        return
      }

      const cr = feed.getBoundingClientRect()
      const cw = cr.width
      const ch = cr.height
      const now = performance.now()

      if (!faceTracking) {
        smoothShapeRef.current = { ...DEFAULT_FITTED_FACE_OVAL }
      }

      if (canRunFace && faceLmRef.current) {
        const fr = faceLmRef.current.detectForVideo(video, now)
        const lm = fr.faceLandmarks[0]
        let sawFace = false
        if (lm) {
          const t = computeFaceOverlayTargets(lm, vw, vh, cw, ch)
          if (t) {
            smoothFaceRef.current = lerpFaceOverlay(smoothFaceRef.current, t, 0.42)
            sawFace = true
          }
        }
        if (!sawFace) {
          smoothFaceRef.current = lerpFaceTowardIdentity(smoothFaceRef.current, 0.2)
        }
        const s = smoothFaceRef.current
        if (isNearIdentity(s)) setTransformIfChanged(null)
        else setTransformIfChanged(faceOverlayToSvgTransform(s))

        if (faceTracking && lm) {
          const pts = contourLandmarksToCanonicalPoints(
            lm,
            vw,
            vh,
            cw,
            ch,
            smoothFaceRef.current,
          )
          const target = boundsToFittedOval(pts)
          if (target) {
            smoothShapeRef.current = lerpFittedOval(
              smoothShapeRef.current,
              target,
              0.32,
            )
          } else {
            smoothShapeRef.current = lerpFittedOvalTowardDefault(
              smoothShapeRef.current,
              0.14,
            )
          }
        } else if (faceTracking) {
          smoothShapeRef.current = lerpFittedOvalTowardDefault(
            smoothShapeRef.current,
            0.2,
          )
        }
      } else {
        setTransformIfChanged(null)
        if (faceTracking) {
          smoothFaceRef.current = lerpFaceTowardIdentity(
            smoothFaceRef.current,
            0.15,
          )
          smoothShapeRef.current = lerpFittedOvalTowardDefault(
            smoothShapeRef.current,
            0.22,
          )
        }
      }

      setInnerShapeIfChanged(
        faceShapeToInnerSvgTransform(smoothShapeRef.current),
      )

      if (canRunHand && handLmRef.current) {
        const result = handLmRef.current.detectForVideo(video, now)
        const hands = result.landmarks

        let firstTip: { vx: number; vy: number } | null = null
        const seen = new Set<number>()

        for (let hi = 0; hi < hands.length; hi++) {
          const hand = hands[hi]
          const tip = hand[INDEX_FINGER_TIP]
          if (!tip) continue

          const posG = normalizedTipToViewBox(
            tip.x,
            tip.y,
            vw,
            vh,
            cw,
            ch,
            false,
          )
          const pos = globalToCanonical(posG.vx, posG.vy)
          seen.add(hi)

          if (!firstTip) firstTip = posG

          const prevG = prevTipsRef.current.get(hi)
          prevTipsRef.current.set(hi, posG)

          if (!prevG) continue
          const prev = globalToCanonical(prevG.vx, prevG.vy)

          const z = hitTestZone(pos.vx, pos.vy)
          if (!z) continue
          const prevZ = hitTestZone(prev.vx, prev.vy)
          if (prevZ !== z) continue

          const dx = pos.vx - prev.vx
          const dy = pos.vy - prev.vy
          const step = Math.hypot(dx, dy)
          if (step < MIN_STEP || step > MAX_STEP) continue

          const acc = rubByZoneRef.current
          acc[z] = (acc[z] || 0) + step
          if (acc[z]! >= RUB_TRAVEL_TO_COVER && !coveredRef.current[z]) {
            acc[z] = 0
            setCovered((prevC) =>
              prevC[z] ? prevC : { ...prevC, [z]: true },
            )
          }
        }

        for (const key of prevTipsRef.current.keys()) {
          if (!seen.has(key)) prevTipsRef.current.delete(key)
        }

        if (firstTip) {
          setFingerPct({
            x: (firstTip.vx / 100) * 100,
            y: (firstTip.vy / 160) * 100,
          })
        } else {
          setFingerPct(null)
        }
      } else {
        setFingerPct(null)
      }

      requestAnimationFrame(tick)
    }

    const id = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(id)
      prevTipsRef.current.clear()
      rubByZoneRef.current = {}
      setFingerPct(null)
    }
  }, [runLoop, canRunFace, canRunHand, faceTracking, handTracking])

  const toggle = (id: ZoneId) => {
    setCovered((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const nCovered = ZONES.filter((z) => covered[z.id]).length
  const pct = Math.round((nCovered / ZONES.length) * 100)

  return (
    <div className="page">
      <section className="section section--page" aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" className="section-title">
          Sunscreen Application Helper
        </h2>

        <div className="coverage-hand-toggle coverage-hand-toggle--wrap">
          <label className="coverage-toggle-label">
            <input
              type="checkbox"
              checked={faceTracking}
              onChange={(e) => setFaceTracking(e.target.checked)}
            />
            Track face (align zones)
          </label>
          <label className="coverage-toggle-label">
            <input
              type="checkbox"
              checked={handTracking}
              onChange={(e) => setHandTracking(e.target.checked)}
            />
            Track hands (index finger)
          </label>
          {faceTracking && faceStatus === 'loading' && (
            <span className="coverage-hand-status">Loading face model…</span>
          )}
          {faceTracking && faceStatus === 'error' && (
            <span className="coverage-hand-status coverage-hand-status--error">
              Face model failed — zones stay fixed.
            </span>
          )}
          {handTracking && handStatus === 'loading' && (
            <span className="coverage-hand-status">Loading hand model…</span>
          )}
          {handTracking && handStatus === 'error' && (
            <span className="coverage-hand-status coverage-hand-status--error">
              Hand model failed — use taps.
            </span>
          )}
          {faceTracking && faceStatus === 'ready' && (
            <span className="coverage-hand-status coverage-hand-status--ok">
              Face-aligned overlay on.
            </span>
          )}
        </div>

        <div className="panel coverage-panel">
          <div ref={feedRef} className="coverage-feed">
            <div className="coverage-mirror-stack">
              <video ref={videoRef} playsInline muted className="coverage-video" />
              <svg
                className="coverage-svg"
                viewBox="0 0 100 160"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <clipPath id={ovalClipId}>
                    <ellipse
                      cx={COVERAGE_OVAL.cx}
                      cy={COVERAGE_OVAL.cy}
                      rx={COVERAGE_OVAL.rx}
                      ry={COVERAGE_OVAL.ry}
                    />
                  </clipPath>
                </defs>
                <g transform={svgTransform ?? undefined}>
                  <g transform={innerShapeTransform}>
                    <ellipse
                      className="coverage-oval-outline"
                      cx={COVERAGE_OVAL.cx}
                      cy={COVERAGE_OVAL.cy}
                      rx={COVERAGE_OVAL.rx}
                      ry={COVERAGE_OVAL.ry}
                    />
                    <g clipPath={`url(#${ovalClipId})`}>
                      {ZONES.map((z) => (
                        <path
                          key={z.id}
                          d={z.path}
                          className={`coverage-zone${covered[z.id] ? ' coverage-zone--done' : ''}`}
                          onClick={() => toggle(z.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggle(z.id)
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-pressed={covered[z.id]}
                          aria-label={`${z.label}, ${covered[z.id] ? 'marked covered' : 'not marked'}. Toggle.`}
                        />
                      ))}
                    </g>
                  </g>
                </g>
              </svg>
              {fingerPct && handTracking && handStatus === 'ready' && (
                <div
                  className="coverage-finger-dot"
                  style={{ left: `${fingerPct.x}%`, top: `${fingerPct.y}%` }}
                  aria-hidden
                />
              )}
            </div>
            {!camReady && !cameraError && (
              <div className="video-placeholder">Starting camera…</div>
            )}
          </div>

          {cameraError && <p className="status error">{cameraError}</p>}

          <div className="coverage-progress">
            <div className="coverage-progress-label">
              <span>Zones covered</span>
              <span>
                {nCovered} / {ZONES.length} ({pct}%)
              </span>
            </div>
            <div className="coverage-progress-bar" aria-hidden>
              <div
                className="coverage-progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="coverage-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void startCamera()}>
              Restart camera
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCovered(initialCoverage())
                rubByZoneRef.current = {}
              }}
            >
              Reset map
            </button>
          </div>

          <div className="coverage-zone-categories">
            {ZONE_CATEGORIES.map((cat) => {
              const catZones = cat.zoneIds.map((id) => zoneById(id))
              const nDone = catZones.filter((z) => covered[z.id]).length
              const total = catZones.length
              const catPct = total ? Math.round((nDone / total) * 100) : 0
              const headingId = `coverage-cat-${cat.id}`
              return (
                <section key={cat.id} className="coverage-category" aria-labelledby={headingId}>
                  <div className="coverage-category-tab">
                    <div className="coverage-category-tab-row">
                      <h3 id={headingId} className="coverage-category-title">
                        {cat.title}
                      </h3>
                      <span className="coverage-category-fraction" aria-live="polite">
                        {nDone}/{total}
                      </span>
                    </div>
                    <div
                      className="coverage-category-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-valuenow={nDone}
                      aria-label={`${cat.title}: ${nDone} of ${total} zones covered`}
                    >
                      <div
                        className="coverage-category-bar-fill"
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  </div>
                  <ul className="coverage-zone-list coverage-zone-list--in-category">
                    {catZones.map((z) => (
                      <li key={z.id}>
                        <button
                          type="button"
                          className={`coverage-zone-btn${covered[z.id] ? ' is-done' : ''}`}
                          onClick={() => toggle(z.id)}
                          aria-label={`${z.label}, ${covered[z.id] ? 'covered' : 'tap when product applied'}. Toggle.`}
                        >
                          <span className="coverage-zone-btn-main">
                            <span className="coverage-zone-dot" aria-hidden />
                            <span className="coverage-zone-name">{z.segmentLabel}</span>
                          </span>
                          <span
                            className={`coverage-zone-status${covered[z.id] ? ' coverage-zone-status--done' : ''}`}
                          >
                            {covered[z.id] ? 'Covered' : 'Tap when applied'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>

          <p className="coverage-footnote">
            Oval size and aspect follow your detected face contour (smoothed each frame). Pose
            alignment still uses nose and eyes. Good, even lighting helps both models.
          </p>
        </div>
      </section>
    </div>
  )
}
