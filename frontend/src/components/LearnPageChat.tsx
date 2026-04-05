import { useMemo } from 'react'
import { SkinChatPanel } from './SkinChatPanel'
import { LEARN_CHAT_CONTEXT, LEARN_CHAT_WELCOME } from '../lib/skinChatMessages'

export function LearnPageChat() {
  const scanContext = useMemo(() => ({ ...LEARN_CHAT_CONTEXT }), [])

  return (
    <SkinChatPanel
      title="Ask the assistant"
      disclaimer="Educational only — not medical advice. For new or changing moles, non-healing spots, or urgent symptoms, see a clinician."
      scanContext={scanContext}
      welcomeMessage={LEARN_CHAT_WELCOME}
      resetKey="learn-page"
      inputPlaceholder="e.g. What does broad-spectrum mean?"
    />
  )
}
