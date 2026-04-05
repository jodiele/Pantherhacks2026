import { HandLandmarker } from '@mediapipe/tasks-vision'
import { getVisionFileset } from './visionFileset'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const fileset = await getVisionFileset()
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numHands: 2,
  })
  try {
    return await HandLandmarker.createFromOptions(fileset, opts('GPU'))
  } catch {
    return await HandLandmarker.createFromOptions(fileset, opts('CPU'))
  }
}
