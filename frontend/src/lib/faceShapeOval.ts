import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { COVERAGE_OVAL, normalizedTipToViewBox } from './coverageZones'
import type { FaceOverlaySmooth } from './faceOverlayTransform'
import { TEMPLATE_ANCHOR, viewBoxGlobalToZoneLocal } from './faceOverlayTransform'

/**
 * Face-oval boundary indices (MediaPipe Face Mesh topology, valid for Face Landmarker).
 * @see https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj
 */
export const FACE_OVAL_CONTOUR_INDICES: readonly number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400,
  377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67,
  109,
]

/** Chin tip / lower jaw — few points so the bbox doesn’t balloon past the face. */
const JAW_CHIN_SUPPLEMENT_INDICES: readonly number[] = [152, 175, 199, 200, 428, 262]

/** Upper forehead / hairline-adjacent (oval loop can sit a little low vs true forehead top). */
const FOREHEAD_SUPPLEMENT_INDICES: readonly number[] = [10, 151, 9, 107, 336, 297]

export type FittedFaceOval = {
  cx: number
  cy: number
  rx: number
  ry: number
}

export const DEFAULT_FITTED_FACE_OVAL: FittedFaceOval = {
  cx: COVERAGE_OVAL.cx,
  cy: COVERAGE_OVAL.cy,
  rx: COVERAGE_OVAL.rx,
  ry: COVERAGE_OVAL.ry,
}

/** Map contour landmarks into canonical template space (same space as zone paths). */
export function contourLandmarksToCanonicalPoints(
  landmarks: NormalizedLandmark[],
  vw: number,
  vh: number,
  cw: number,
  ch: number,
  face: FaceOverlaySmooth,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  const indices = new Set<number>([
    ...FACE_OVAL_CONTOUR_INDICES,
    ...JAW_CHIN_SUPPLEMENT_INDICES,
    ...FOREHEAD_SUPPLEMENT_INDICES,
  ])
  for (const i of indices) {
    const p = landmarks[i]
    if (!p) continue
    const cam = normalizedTipToViewBox(p.x, p.y, vw, vh, cw, ch, false)
    const c = viewBoxGlobalToZoneLocal(
      cam.vx,
      cam.vy,
      { x: face.noseX, y: face.noseY },
      face.rotDeg,
      face.scale,
      TEMPLATE_ANCHOR,
    )
    out.push({ x: c.vx, y: c.vy })
  }
  return out
}

/** Axis-aligned bounds → ellipse; modest chin extension, tight horizontal pad. */
export function boundsToFittedOval(
  points: { x: number; y: number }[],
): FittedFaceOval | null {
  if (points.length < 12) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const spanY = maxY - minY
  const spanX = maxX - minX
  if (spanY < 2) return null

  maxY += spanY * 0.19
  minY -= spanY * 0.058
  minX -= spanX * 0.018
  maxX += spanX * 0.018

  const cx = (minX + maxX) / 2
  /** Nudge whole oval up by 10% of raw face height (smaller y = higher on forehead). */
  const cy = (minY + maxY) / 2 - spanY * 0.1
  let rx = ((maxX - minX) / 2) * 1.015
  let ry = ((maxY - minY) / 2) * 1.015
  rx *= 0.9
  ry *= 0.9
  rx *= 1.02
  rx = Math.min(45, Math.max(24, rx))
  ry = Math.max(38, Math.min(90, ry))
  return { cx, cy, rx, ry }
}

export function lerpFittedOval(
  cur: FittedFaceOval,
  target: FittedFaceOval,
  alpha: number,
): FittedFaceOval {
  return {
    cx: cur.cx + (target.cx - cur.cx) * alpha,
    cy: cur.cy + (target.cy - cur.cy) * alpha,
    rx: cur.rx + (target.rx - cur.rx) * alpha,
    ry: cur.ry + (target.ry - cur.ry) * alpha,
  }
}

export function lerpFittedOvalTowardDefault(
  cur: FittedFaceOval,
  alpha: number,
): FittedFaceOval {
  return lerpFittedOval(cur, DEFAULT_FITTED_FACE_OVAL, alpha)
}

/** Undo inner `translate(cx,cy) scale(rx/refRx) scale(ry/refRy) translate(-50,-80)` in template space. */
export function inverseFaceShapeWarp(
  vx: number,
  vy: number,
  oval: FittedFaceOval,
): { vx: number; vy: number } {
  const sx = oval.rx / COVERAGE_OVAL.rx
  const sy = oval.ry / COVERAGE_OVAL.ry
  const scx = sx > 1e-6 ? sx : 1
  const scy = sy > 1e-6 ? sy : 1
  const x = (vx - oval.cx) / scx + COVERAGE_OVAL.cx
  const y = (vy - oval.cy) / scy + COVERAGE_OVAL.cy
  return { vx: x, vy: y }
}

export function faceShapeToInnerSvgTransform(oval: FittedFaceOval): string {
  const sx = oval.rx / COVERAGE_OVAL.rx
  const sy = oval.ry / COVERAGE_OVAL.ry
  return `translate(${oval.cx},${oval.cy}) scale(${sx},${sy}) translate(${-COVERAGE_OVAL.cx},${-COVERAGE_OVAL.cy})`
}
