import type { ChatMessage, ScanChatContextPayload } from '../types/chat'

export type ChatResponse = { reply: string }

/**
 * POST /api/chat — used after a photo scan and on the Learn page.
 */
export async function postChat(
  messages: ChatMessage[],
  scanContext: ScanChatContextPayload,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, scan_context: scanContext }),
  })
  const text = await res.text()
  const trimmed = text.trim()
  let data: ChatResponse & { error?: string }
  try {
    data = JSON.parse(trimmed) as ChatResponse & { error?: string }
  } catch {
    throw new Error(
      `Chat server did not return JSON (HTTP ${res.status}). ${trimmed.slice(0, 120)}`,
    )
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Chat request failed')
  }
  if (!data.reply?.trim()) {
    throw new Error('Empty reply from chat server')
  }
  return data.reply.trim()
}

/** @deprecated Use postChat — same behavior. */
export const postScanChat = postChat
