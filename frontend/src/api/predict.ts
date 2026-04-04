import type { PredictOk } from '../types/predict'

export async function predictImage(file: File): Promise<PredictOk> {
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
