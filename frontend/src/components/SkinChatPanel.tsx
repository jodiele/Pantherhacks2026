import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { postChat } from '../api/chat'
import { stripChatBoldMarkers } from '../lib/utils'
import type { ChatMessage, ScanChatContextPayload } from '../types/chat'

export type SkinChatPanelProps = {
  title: string
  disclaimer: string
  scanContext: ScanChatContextPayload
  welcomeMessage: string
  resetKey: string
  inputPlaceholder: string
}

export function SkinChatPanel({
  title,
  disclaimer,
  scanContext,
  welcomeMessage,
  resetKey,
  inputPlaceholder,
}: SkinChatPanelProps) {
  const inputId = useId()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{ role: 'assistant', content: welcomeMessage }])
    setDraft('')
    setError(null)
  }, [resetKey, welcomeMessage])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: text }
    const historyForApi = [...messages, userMsg]
    setMessages(historyForApi)
    setDraft('')
    setSending(true)
    try {
      const reply = await postChat(historyForApi, scanContext)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach chat server.')
      setMessages((prev) => prev.slice(0, -1))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }, [draft, messages, scanContext, sending])

  return (
    <div className="result-card scan-chat-card">
      <h2>{title}</h2>
      <p className="model-note scan-chat-disclaimer">{disclaimer}</p>
      <div ref={listRef} className="scan-chat-log" role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`scan-chat-bubble scan-chat-bubble--${m.role}`}>
            <span className="scan-chat-bubble-label">
              {m.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className="scan-chat-bubble-text">{stripChatBoldMarkers(m.content)}</div>
          </div>
        ))}
        {sending && (
          <div className="scan-chat-bubble scan-chat-bubble--assistant scan-chat-bubble--typing">
            <span className="scan-chat-bubble-label">Assistant</span>
            <div className="scan-chat-bubble-text">Thinking…</div>
          </div>
        )}
      </div>
      {error && <p className="status error scan-chat-error">{error}</p>}
      <div className="scan-chat-compose">
        <label className="sr-only" htmlFor={inputId}>
          Your message
        </label>
        <textarea
          id={inputId}
          className="scan-chat-input"
          rows={2}
          placeholder={inputPlaceholder}
          value={draft}
          disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary scan-chat-send"
          disabled={sending || !draft.trim()}
          onClick={() => void send()}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
