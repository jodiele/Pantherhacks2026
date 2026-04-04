import { BurnAlertCard } from '../components/BurnAlertCard'
import { useSunCheck } from '../context/SunCheckContext'
import { formatLabel, topScores } from '../lib/format'
import { moistureHintLabel, sunburnDegreeLabel } from '../lib/scanLabels'
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
          Photo scan (demo)
        </h2>
        <p className="section-lead">
          We show a simple <strong>oily vs dry</strong> readout from the model’s scores for
          those two classes, and a <strong>sun-stress band</strong> from image color (not a
          real burn diagnosis). For judges: this is a hackathon demo only.
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

            <div className="result-card summary-card">
              <h2>Moisture hint (oily / dry)</h2>
              <p className="prediction-main">
                {moistureHintLabel(result.moisture_hint)}
              </p>
              <p className="model-note">
                From the model’s <strong>oily</strong> vs <strong>dry</strong> probabilities
                only. If both are weak, we say “unclear.” Not a clinical skin-type test.
              </p>
            </div>

            <div className="result-card summary-card">
              <h2>Sun-stress band (demo)</h2>
              <p className="prediction-main">
                {sunburnDegreeLabel(result.sunburn_degree)}
              </p>
              {warmthSignal !== null && (
                <>
                  <p className="warmth-bar-wrap">
                    <span
                      className="warmth-bar"
                      style={{ width: `${Math.round(warmthSignal * 100)}%` }}
                    />
                  </p>
                  <p className="warmth-caption">
                    Color “warmth” index: {Math.round(warmthSignal * 100)}% — does{' '}
                    <strong>not</strong> mean you are or aren’t sunburned.
                  </p>
                </>
              )}
            </div>

            <div className="result-card">
              <h2>Original model top label (technical)</h2>
              <p className="prediction-main">{formatLabel(result.label)}</p>
              <p className="confidence">
                Argmax confidence {Math.round(result.confidence * 1000) / 10}%
              </p>
              <p className="model-note">
                The network was trained on nine skin labels; the argmax is often wrong on
                random photos. Prefer the oily/dry and sun-stress summaries above for your
                demo story.
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
