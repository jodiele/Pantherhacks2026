import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocation } from 'react-router-dom'
import { predictImage } from '../api/predict'
import { geocodeCityState, reverseGeocodeLatLon } from '../lib/geocode'
import type { PredictOk } from '../types/predict'
import {
  estimateWarmthSignal,
  fetchCurrentUv,
} from '../sunburn'

type SunCheckContextValue = {
  mode: 'camera' | 'upload'
  setMode: (m: 'camera' | 'upload') => void
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  camReady: boolean
  previewUrl: string | null
  uploadFile: File | null
  loading: boolean
  scanError: string | null
  cameraError: string | null
  result: PredictOk | null
  warmthSignal: number | null
  uvIndex: number | null
  uvCoords: { lat: number; lon: number } | null
  /** City/region label from city/state search or reverse geocode after GPS */
  uvPlaceLabel: string | null
  uvLoading: boolean
  uvError: string | null
  manualCity: string
  setManualCity: (s: string) => void
  manualState: string
  setManualState: (s: string) => void
  refreshUvFromLocation: () => void
  applyCityStatePlace: () => Promise<void>
  startCamera: () => Promise<void>
  capturePhoto: () => Promise<void>
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  analyzeUpload: () => Promise<void>
}

const SunCheckContext = createContext<SunCheckContextValue | null>(null)

export function SunCheckProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const onScanPage = pathname === '/scan'

  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [camReady, setCamReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictOk | null>(null)
  const [warmthSignal, setWarmthSignal] = useState<number | null>(null)

  const [uvIndex, setUvIndex] = useState<number | null>(null)
  const [uvCoords, setUvCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  )
  const [uvPlaceLabel, setUvPlaceLabel] = useState<string | null>(null)
  const [uvLoading, setUvLoading] = useState(false)
  const [uvError, setUvError] = useState<string | null>(null)
  const [manualCity, setManualCity] = useState('')
  const [manualState, setManualState] = useState('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play()
        setCamReady(true)
      }
    } catch (e) {
      setCameraError(
        e instanceof Error
          ? e.message
          : 'Could not access the camera. Allow permission or use upload instead.',
      )
    }
  }, [stopCamera])

  useEffect(() => {
    if (!onScanPage) {
      stopCamera()
      return
    }
    if (mode === 'camera') {
      void startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [onScanPage, mode, startCamera, stopCamera])

  const loadUvForCoords = useCallback(
    async (lat: number, lon: number, placeLabel: string | null = null) => {
      setUvLoading(true)
      setUvError(null)
      try {
        const uv = await fetchCurrentUv(lat, lon)
        setUvIndex(uv)
        setUvCoords({ lat, lon })
        setUvPlaceLabel(placeLabel)
      } catch (e) {
        setUvError(e instanceof Error ? e.message : 'Could not load UV index.')
        setUvIndex(null)
        setUvCoords(null)
        setUvPlaceLabel(null)
      } finally {
        setUvLoading(false)
      }
    },
    [],
  )

  const refreshUvFromLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUvError('Geolocation is not available in this browser.')
      return
    }
    setUvLoading(true)
    setUvError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          const placeLabel = await reverseGeocodeLatLon(lat, lon)
          await loadUvForCoords(lat, lon, placeLabel)
        })()
      },
      (err) => {
        setUvLoading(false)
        setUvError(
          err.code === 1
            ? 'Location permission denied. Enter city and state below or enable location.'
            : 'Could not read your location.',
        )
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    )
  }, [loadUvForCoords])

  const applyCityStatePlace = useCallback(async () => {
    setUvError(null)
    let hit: Awaited<ReturnType<typeof geocodeCityState>>
    try {
      hit = await geocodeCityState(manualCity, manualState)
    } catch (e) {
      setUvError(e instanceof Error ? e.message : 'Could not find that place.')
      setUvIndex(null)
      setUvCoords(null)
      setUvPlaceLabel(null)
      return
    }
    await loadUvForCoords(hit.lat, hit.lon, hit.label)
  }, [manualCity, manualState, loadUvForCoords])

  const runPredict = useCallback(async (file: File) => {
    setLoading(true)
    setScanError(null)
    setResult(null)
    setWarmthSignal(null)
    try {
      const data = await predictImage(file)
      setResult(data)
      try {
        setWarmthSignal(await estimateWarmthSignal(file))
      } catch {
        setWarmthSignal(null)
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !camReady) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setScanError('Video not ready yet.')
      return
    }

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) {
      setScanError('Could not capture image.')
      return
    }

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(blob)
    })
    setUploadFile(null)

    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
    await runPredict(file)
  }, [camReady, runPredict])

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setScanError(null)
    setResult(null)
    setWarmthSignal(null)
    setUploadFile(f)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }, [])

  const analyzeUpload = useCallback(async () => {
    if (!uploadFile) return
    await runPredict(uploadFile)
  }, [uploadFile, runPredict])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const value = useMemo<SunCheckContextValue>(
    () => ({
      mode,
      setMode,
      videoRef,
      canvasRef,
      camReady,
      previewUrl,
      uploadFile,
      loading,
      scanError,
      cameraError,
      result,
      warmthSignal,
      uvIndex,
      uvCoords,
      uvPlaceLabel,
      uvLoading,
      uvError,
      manualCity,
      setManualCity,
      manualState,
      setManualState,
      refreshUvFromLocation,
      applyCityStatePlace,
      startCamera,
      capturePhoto,
      onFileChange,
      analyzeUpload,
    }),
    [
      mode,
      camReady,
      previewUrl,
      uploadFile,
      loading,
      scanError,
      cameraError,
      result,
      warmthSignal,
      uvIndex,
      uvCoords,
      uvPlaceLabel,
      uvLoading,
      uvError,
      manualCity,
      manualState,
      refreshUvFromLocation,
      applyCityStatePlace,
      startCamera,
      capturePhoto,
      onFileChange,
      analyzeUpload,
    ],
  )

  return (
    <SunCheckContext.Provider value={value}>{children}</SunCheckContext.Provider>
  )
}

export function useSunCheck() {
  const ctx = useContext(SunCheckContext)
  if (!ctx) {
    throw new Error('useSunCheck must be used within SunCheckProvider')
  }
  return ctx
}
