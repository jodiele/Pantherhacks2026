import type { MoistureHint, SunburnDegree } from '../types/predict'

/** Human-facing skin-type line from the moisture (oily vs dry) head. */
export function moistureHintLabel(h: MoistureHint): string {
  switch (h) {
    case 'oily':
      return 'Oily skin type'
    case 'dry':
      return 'Dry skin type'
    default:
      return 'Combination / balanced skin type'
  }
}

/** UV-related band from image warmth — shown as part of the skin readout. */
export function sunburnDegreeLabel(d: SunburnDegree): string {
  switch (d) {
    case 'none':
      return 'Low UV exposure signal'
    case 'mild':
      return 'Mild UV exposure signal'
    case 'moderate':
      return 'Moderate UV exposure signal'
    default:
      return 'Elevated UV exposure signal'
  }
}
