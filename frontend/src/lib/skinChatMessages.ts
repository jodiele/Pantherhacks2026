/**
 * Shared payloads and welcome copy for the skin education chat (scan + learn pages).
 */
import { formatLabel, topScores } from './format'
import { moistureHintLabel, sunburnDegreeLabel } from './scanLabels'
import type { PredictOk } from '../types/predict'
import type { ScanChatContextPayload } from '../types/chat'

export function buildScanChatContext(
  result: PredictOk,
  warmthSignal: number | null,
): ScanChatContextPayload {
  const scores = topScores(result.scores, 5).map(([name, val]) => ({
    name: formatLabel(name),
    pct: Math.round(val * 1000) / 10,
  }))
  return {
    moisture_hint: moistureHintLabel(result.moisture_hint),
    sunburn_degree: sunburnDegreeLabel(result.sunburn_degree),
    top_label: formatLabel(result.label),
    confidence: Math.round(result.confidence * 1000) / 10,
    warmth_percent:
      warmthSignal !== null ? Math.round(warmthSignal * 1000) / 10 : null,
    scores_top: scores,
  }
}

export function buildScanWelcomeMessage(ctx: ScanChatContextPayload): string {
  const warmthLine =
    ctx.warmth_percent !== null
      ? `• Tone warmth index: ~${ctx.warmth_percent}% (feeds the UV signal above)\n`
      : ''
  return (
    `Here’s what this scan measured for your skin (educational — not a substitute for a clinician):\n\n` +
    `• Skin type: ${ctx.moisture_hint}\n` +
    `• UV exposure signal: ${ctx.sunburn_degree}\n` +
    warmthLine +
    `\n` +
    `Those two lines are the main readout. Raw classifier scores and labels are on the page below for transparency — ` +
    `they’re noisy and can misread casual photos, so lean on skin type and UV signal when you ask me questions.\n\n` +
    `Ask about routines, SPF, oiliness, or when to see a dermatologist.`
  )
}

export const LEARN_CHAT_CONTEXT: ScanChatContextPayload = {
  context_mode: 'learn',
  moisture_hint: '—',
  sunburn_degree: '—',
  top_label: '—',
  confidence: 0,
  warmth_percent: null,
  scores_top: [],
}

export const LEARN_CHAT_WELCOME =
  `You’re on the Learn page (sun exposure and skin cancer awareness). Ask anything about:\n\n` +
  `• SPF, broad-spectrum sunscreen, and how often to reapply\n` +
  `• UV index, shade, hats, and clothing\n` +
  `• Cumulative sun damage vs single burns\n` +
  `• When to see a dermatologist\n\n` +
  `Smart replies use the API server’s Mistral/OpenAI key when set; otherwise you’ll get short offline tips.`
