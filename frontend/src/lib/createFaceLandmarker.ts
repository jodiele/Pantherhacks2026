import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { getVisionFileset } from './visionFileset'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  const fileset = await getVisionFileset()
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    minFaceDetectionConfidence: 0.4,
    minFacePresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  })
  try {
    return await FaceLandmarker.createFromOptions(fileset, opts('GPU'))
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, opts('CPU'))
  }
}
