import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { normalizedTipToViewBox } from './coverageZones'

/** MediaPipe Face Landmarker indices (canonical face mesh). */
export const LM_NOSE_TIP = 1
export const LM_LEFT_EYE_OUTER = 33
export const LM_RIGHT_EYE_OUTER = 263

/** Nose anchor in template zone space (matches static overlay layout). */
export const TEMPLATE_ANCHOR = { x: 50, y: 76 }

/**
 * Expected inter-eye distance in template viewBox units at scale 1.
 * Larger → smaller mask on face (same webcam geometry).
 */
const REF_INTER_EYE = 35

/** Extra shrink so zones sit tighter than raw eye-distance fit. */
const OVERLAY_SHRINK = 0.88

export type FaceOverlaySmooth = {
  noseX: number
  noseY: number
  rotDeg: number
  scale: number
}

export function computeFaceOverlayTargets(
  landmarks: NormalizedLandmark[],
  vw: number,
  vh: number,
  cw: number,
  ch: number,
): { noseX: number; noseY: number; rotDeg: number; scale: number } | null {
  const n = landmarks[LM_NOSE_TIP]
  const le = landmarks[LM_LEFT_EYE_OUTER]
  const re = landmarks[LM_RIGHT_EYE_OUTER]
  if (!n || !le || !re) return null

  const nose = normalizedTipToViewBox(n.x, n.y, vw, vh, cw, ch, false)
  const left = normalizedTipToViewBox(le.x, le.y, vw, vh, cw, ch, false)
  const right = normalizedTipToViewBox(re.x, re.y, vw, vh, cw, ch, false)

  const interEye = Math.hypot(right.vx - left.vx, right.vy - left.vy)
  if (interEye < 7) return null

  let scale = (interEye / REF_INTER_EYE) * OVERLAY_SHRINK
  scale = Math.min(1.65, Math.max(0.4, scale))

  const rotDeg =
    (Math.atan2(right.vy - left.vy, right.vx - left.vx) * 180) / Math.PI

  return { noseX: nose.vx, noseY: nose.vy, rotDeg, scale }
}

function rotDelta(from: number, to: number): number {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

export function lerpFaceOverlay(
  cur: FaceOverlaySmooth,
  target: FaceOverlaySmooth,
  alpha: number,
): FaceOverlaySmooth {
  return {
    noseX: cur.noseX + (target.noseX - cur.noseX) * alpha,
    noseY: cur.noseY + (target.noseY - cur.noseY) * alpha,
    rotDeg: cur.rotDeg + rotDelta(cur.rotDeg, target.rotDeg) * alpha,
    scale: cur.scale + (target.scale - cur.scale) * alpha,
  }
}

export function lerpFaceTowardIdentity(
  cur: FaceOverlaySmooth,
  alpha: number,
): FaceOverlaySmooth {
  const id: FaceOverlaySmooth = {
    noseX: TEMPLATE_ANCHOR.x,
    noseY: TEMPLATE_ANCHOR.y,
    rotDeg: 0,
    scale: 1,
  }
  return lerpFaceOverlay(cur, id, alpha)
}

export function isNearIdentity(s: FaceOverlaySmooth): boolean {
  return (
    Math.abs(s.noseX - TEMPLATE_ANCHOR.x) < 1.2 &&
    Math.abs(s.noseY - TEMPLATE_ANCHOR.y) < 1.2 &&
    Math.abs(s.scale - 1) < 0.06 &&
    Math.abs(s.rotDeg) < 2
  )
}

/** Map fingertip from display viewBox coords into untransformed zone template coords. */
export function viewBoxGlobalToZoneLocal(
  gx: number,
  gy: number,
  nose: { x: number; y: number },
  rotDeg: number,
  scale: number,
  anchor: { x: number; y: number },
): { vx: number; vy: number } {
  let x = gx - nose.x
  let y = gy - nose.y
  const rad = (-rotDeg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const xr = c * x - s * y
  const yr = s * x + c * y
  const sc = scale > 1e-6 ? scale : 1
  return {
    vx: xr / sc + anchor.x,
    vy: yr / sc + anchor.y,
  }
}

export function faceOverlayToSvgTransform(s: FaceOverlaySmooth): string {
  const { x: ax, y: ay } = TEMPLATE_ANCHOR
  return `translate(${s.noseX},${s.noseY}) rotate(${s.rotDeg}) scale(${s.scale}) translate(${-ax},${-ay})`
}
