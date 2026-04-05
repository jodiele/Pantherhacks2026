import { useMemo } from 'react'
import { SkinChatPanel } from './SkinChatPanel'
import {
  buildScanChatContext,
  buildScanWelcomeMessage,
} from '../lib/skinChatMessages'
import type { PredictOk } from '../types/predict'

type Props = {
  result: PredictOk
  warmthSignal: number | null
  resetKey: string
}

export function ScanFollowUpChat({ result, warmthSignal, resetKey }: Props) {
  const scanContext = useMemo(
    () => buildScanChatContext(result, warmthSignal),
    [result, warmthSignal],
  )
  const welcomeMessage = useMemo(
    () => buildScanWelcomeMessage(scanContext),
    [scanContext],
  )

  return (
    <SkinChatPanel
      title="After your scan — ask questions"
      disclaimer="Educational only — not a doctor. For rashes, changing moles, or severe symptoms, seek professional care."
      scanContext={scanContext}
      welcomeMessage={welcomeMessage}
      resetKey={resetKey}
      inputPlaceholder="e.g. How should I read my UV exposure signal?"
    />
  )
}
