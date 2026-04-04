export type MoistureHint = 'oily' | 'dry' | 'unclear'
export type SunburnDegree = 'none' | 'mild' | 'moderate' | 'severe'

export type PredictOk = {
  label: string
  confidence: number
  scores: Record<string, number>
  moisture_hint: MoistureHint
  sunburn_degree: SunburnDegree
  warmth_signal: number
  filename?: string
}
