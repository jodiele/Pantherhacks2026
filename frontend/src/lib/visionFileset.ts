import { FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'

let cache: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | undefined

export function getVisionFileset() {
  if (!cache) {
    cache = FilesetResolver.forVisionTasks(WASM_BASE)
  }
  return cache
}
