import type { MoistureHint, SunburnDegree } from '../types/predict'

export function moistureHintLabel(h: MoistureHint): string {
  switch (h) {
    case 'oily':
      return 'Leans oily'
    case 'dry':
      return 'Leans dry'
    default:
      return 'Dry vs oily — unclear'
  }
}

export function sunburnDegreeLabel(d: SunburnDegree): string {
  switch (d) {
    case 'none':
      return 'No strong sun-stress signal'
    case 'mild':
      return 'Mild sun-stress signal (demo)'
    case 'moderate':
      return 'Moderate sun-stress signal (demo)'
    default:
      return 'Strong sun-stress signal (demo)'
  }
}
