export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ScanChatContextPayload = {
  /** When set, the API uses learn-page instructions (no photo scan). */
  context_mode?: 'learn'
  moisture_hint: string
  sunburn_degree: string
  top_label: string
  confidence: number
  warmth_percent: number | null
  scores_top: Array<{ name: string; pct: number }>
}
