import { BurnAlertCard } from '../components/BurnAlertCard'
import { useSunCheck } from '../context/SunCheckContext'
import { formatLabel, topScores } from '../lib/format'
import {
  SUNBURN_CARE,
  WHEN_TO_SEEK_CARE,
  warmthPhotoBurnNotice,
} from '../sunburn'

export function ScanPage() {
  const {
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
    startCamera,
    capturePhoto,
    onFileChange,
    analyzeUpload,
  } = useSunCheck()

  const scores = result?.scores ? topScores(result.scores) : []
  const warmthBurnAlert =
    result !== null && warmthSignal !== null
      ? warmthPhotoBurnNotice(warmthSignal)
      : null

  return (
    <div className="page">
      <section className="section section--page" aria-labelledby="scan-heading">
        <h2 id="scan-heading" className="section-title">
          Photo scan (demo model)
        </h2>
        <p className="section-lead">
          The backend runs a research classifier on your image, plus a simple color-based
          “warmth” signal—informal only, not a burn detector.
        </p>

        <div className="mode-tabs">
          <button
            type="button"
            className={mode === 'camera' ? 'active' : ''}
            onClick={() => setMode('camera')}
          >
            Webcam
          </button>
          <button
            type="button"
            className={mode === 'upload' ? 'active' : ''}
            onClick={() => setMode('upload')}
          >
            Upload file
          </button>
        </div>

        {mode === 'camera' && (
          <div className="panel">
            <div className="video-wrap">
              <video ref={videoRef} playsInline muted />
              {!camReady && !cameraError && (
                <div className="video-placeholder">Starting camera…</div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {cameraError && <p className="status error">{cameraError}</p>}
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void capturePhoto()}
                disabled={!camReady || loading}
              >
                {loading ? 'Analyzing…' : 'Capture & analyze'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void startCamera()}
                disabled={loading}
              >
                Restart camera
              </button>
            </div>
            {previewUrl && (
              <div className="preview-row">
                <img src={previewUrl} alt="Last capture" />
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="panel">
            <label className="upload-zone">
              <input
                className="file-input"
                type="file"
                accept="image/*"
                onChange={onFileChange}
              />
              <div>
                Drop an image here or <strong>browse</strong>
                <br />
                <span className="status">Well-lit, steady photos work best</span>
              </div>
            </label>
            {previewUrl && uploadFile && (
              <div className="preview-row">
                <img src={previewUrl} alt="Preview" />
                <div className="actions" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void analyzeUpload()}
                    disabled={loading}
                  >
                    {loading ? 'Analyzing…' : 'Analyze image'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {scanError && <p className="status error">{scanError}</p>}

        {result && (
          <div className="result-stack">
            {warmthBurnAlert && <BurnAlertCard alert={warmthBurnAlert} />}
            {warmthSignal !== null && (
              <div className="result-card warmth-card">
                <h2>Warmth signal (demo)</h2>
                <p className="warmth-bar-wrap">
                  <span
                    className="warmth-bar"
                    style={{ width: `${Math.round(warmthSignal * 100)}%` }}
                  />
                </p>
                <p className="warmth-caption">
                  Informal red-channel hint: {Math.round(warmthSignal * 100)}% — not a
                  clinical measure of sunburn.
                </p>
              </div>
            )}

            <div className="result-card">
              <h2>Model pattern match</h2>
              <p className="prediction-main">{formatLabel(result.label)}</p>
              <p className="confidence">
                Confidence {Math.round(result.confidence * 1000) / 10}%
              </p>
              <p className="model-note">
                Trained labels are not specific to sunburn. Use this only as a hackathon demo
                alongside UV and real medical guidance.
              </p>
              <ul className="score-list">
                {scores.map(([name, val]) => (
                  <li key={name}>
                    <div className="score-row">
                      <span>{formatLabel(name)}</span>
                      <span>{Math.round(val * 1000) / 10}%</span>
                    </div>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${val * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-card care-card">
              <h2>If skin feels burned</h2>
              <ul className="tip-list">
                {SUNBURN_CARE.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="urgent-care">{WHEN_TO_SEEK_CARE}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
