export type PredictOk = {
  label: string
  confidence: number
  scores: Record<string, number>
  filename?: string
}
