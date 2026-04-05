/** Face oval in viewBox 0–100 × 0–160 (inside `.coverage-mirror-stack` flip). */
export const COVERAGE_OVAL = {
  cx: 50,
  cy: 80,
  rx: 41,
  ry: 57,
} as const

/**
 * 15 cells (3×5) clipped to the oval — finer sunscreen sections.
 * Columns: left / center / right. Rows: forehead → upper → mid → lower face → jaw.
 */
export const ZONES = [
  {
    id: 'fore_left',
    label: 'Forehead (left)',
    path: 'M 10 24 L 36 24 L 36 44 L 10 44 Z',
    hit: { minX: 10, minY: 24, maxX: 36, maxY: 44 },
  },
  {
    id: 'fore_mid',
    label: 'Forehead (center)',
    path: 'M 36 24 L 64 24 L 64 44 L 36 44 Z',
    hit: { minX: 36, minY: 24, maxX: 64, maxY: 44 },
  },
  {
    id: 'fore_right',
    label: 'Forehead (right)',
    path: 'M 64 24 L 90 24 L 90 44 L 64 44 Z',
    hit: { minX: 64, minY: 24, maxX: 90, maxY: 44 },
  },
  {
    id: 'upper_left',
    label: 'Upper face (left)',
    path: 'M 9 44 L 36 44 L 36 64 L 9 64 Z',
    hit: { minX: 9, minY: 44, maxX: 36, maxY: 64 },
  },
  {
    id: 'upper_mid',
    label: 'Upper face (center)',
    path: 'M 36 44 L 64 44 L 64 64 L 36 64 Z',
    hit: { minX: 36, minY: 44, maxX: 64, maxY: 64 },
  },
  {
    id: 'upper_right',
    label: 'Upper face (right)',
    path: 'M 64 44 L 91 44 L 91 64 L 64 64 Z',
    hit: { minX: 64, minY: 44, maxX: 91, maxY: 64 },
  },
  {
    id: 'mid_left',
    label: 'Mid face (left)',
    path: 'M 8 64 L 36 64 L 36 86 L 8 86 Z',
    hit: { minX: 8, minY: 64, maxX: 36, maxY: 86 },
  },
  {
    id: 'mid_center',
    label: 'Mid face (nose/center)',
    path: 'M 36 64 L 64 64 L 64 86 L 36 86 Z',
    hit: { minX: 36, minY: 64, maxX: 64, maxY: 86 },
  },
  {
    id: 'mid_right',
    label: 'Mid face (right)',
    path: 'M 64 64 L 92 64 L 92 86 L 64 86 Z',
    hit: { minX: 64, minY: 64, maxX: 92, maxY: 86 },
  },
  {
    id: 'lower_face_left',
    label: 'Lower face (left)',
    path: 'M 10 86 L 38 86 L 38 108 L 10 108 Z',
    hit: { minX: 10, minY: 86, maxX: 38, maxY: 108 },
  },
  {
    id: 'lower_face_mid',
    label: 'Lower face (center)',
    path: 'M 38 86 L 62 86 L 62 108 L 38 108 Z',
    hit: { minX: 38, minY: 86, maxX: 62, maxY: 108 },
  },
  {
    id: 'lower_face_right',
    label: 'Lower face (right)',
    path: 'M 62 86 L 90 86 L 90 108 L 62 108 Z',
    hit: { minX: 62, minY: 86, maxX: 90, maxY: 108 },
  },
  {
    id: 'jaw_left',
    label: 'Jaw (left)',
    path: 'M 12 109 L 40 109 L 42 132 L 14 132 Z',
    hit: { minX: 10, minY: 109, maxX: 42, maxY: 132 },
  },
  {
    id: 'jaw_center',
    label: 'Chin (center)',
    path: 'M 38 109 L 62 109 L 62 132 L 38 132 Z',
    hit: { minX: 38, minY: 109, maxX: 62, maxY: 132 },
  },
  {
    id: 'jaw_right',
    label: 'Jaw (right)',
    path: 'M 60 109 L 88 109 L 86 132 L 58 132 Z',
    hit: { minX: 58, minY: 109, maxX: 90, maxY: 132 },
  },
] as const

export type ZoneId = (typeof ZONES)[number]['id']

export function initialCoverage(): Record<ZoneId, boolean> {
  return Object.fromEntries(ZONES.map((z) => [z.id, false])) as Record<
    ZoneId,
    boolean
  >
}

/** MediaPipe index-finger tip (landmark 8). */
export const INDEX_FINGER_TIP = 8

/**
 * Map normalized hand coords (0–1, top-left origin) to coverage viewBox coords,
 * accounting for CSS object-fit: cover. Pass mirrorX only if the preview is not wrapped in a CSS flip.
 */
export function normalizedTipToViewBox(
  nx: number,
  ny: number,
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  mirrorX: boolean,
): { vx: number; vy: number } {
  let x = nx
  if (mirrorX) x = 1 - x

  const vr = videoWidth / videoHeight
  const cr = containerWidth / containerHeight
  let scale: number
  let ox: number
  let oy: number
  if (vr > cr) {
    scale = containerHeight / videoHeight
    ox = (containerWidth - videoWidth * scale) * 0.5
    oy = 0
  } else {
    scale = containerWidth / videoWidth
    ox = 0
    oy = (containerHeight - videoHeight * scale) * 0.5
  }

  const px = x * videoWidth * scale + ox
  const py = ny * videoHeight * scale + oy
  return {
    vx: (px / containerWidth) * 100,
    vy: (py / containerHeight) * 160,
  }
}

function pointInOval(vx: number, vy: number): boolean {
  const dx = (vx - COVERAGE_OVAL.cx) / COVERAGE_OVAL.rx
  const dy = (vy - COVERAGE_OVAL.cy) / COVERAGE_OVAL.ry
  return dx * dx + dy * dy <= 1.02
}

export function hitTestZone(vx: number, vy: number): ZoneId | null {
  if (!pointInOval(vx, vy)) return null
  for (const z of ZONES) {
    const { minX, minY, maxX, maxY } = z.hit
    if (vx >= minX && vx <= maxX && vy >= minY && vy <= maxY) return z.id
  }
  return null
}
