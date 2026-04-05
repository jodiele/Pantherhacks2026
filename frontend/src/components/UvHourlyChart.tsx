import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { UvHourlyPoint } from '../sunburn'

type Props = {
  points: UvHourlyPoint[]
  /** If set, caps how many hours are shown (from start of day). Default: all points. */
  maxPoints?: number
  /** Current time — used to draw the vertical “now” marker on the timeline */
  nowAt: Date
}

const VB_W = 520
const VB_H = 268
const PAD_L = 44
const PAD_R = 28
const PAD_T = 28
const PAD_B = 52

function svgPointToChartOffset(
  svg: SVGSVGElement,
  chart: HTMLDivElement,
  vx: number,
  vy: number,
): { left: number; top: number } {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { left: 0, top: 0 }
  const sp = new DOMPoint(vx, vy).matrixTransform(ctm)
  const cr = chart.getBoundingClientRect()
  return { left: sp.x - cr.left, top: sp.y - cr.top }
}

type DotTip = { left: number; top: number; uv: number; label: string }

export function UvHourlyChart({ points, maxPoints, nowAt }: Props) {
  const gradId = useId().replace(/:/g, '')
  const chartRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dotTip, setDotTip] = useState<DotTip | null>(null)

  const placeDotTip = useCallback(
    (d: { cx: number; cy: number; uv: number; label: string }) => {
      const chart = chartRef.current
      const svg = svgRef.current
      if (!chart || !svg) return
      const { left, top } = svgPointToChartOffset(svg, chart, d.cx, d.cy)
      setDotTip({ left, top, uv: d.uv, label: d.label })
    },
    [],
  )
  const hideDotTip = useCallback(() => setDotTip(null), [])

  const { data, linePath, areaPath, dots, xLabels, yTicks, nowLineX } = useMemo(() => {
    const data =
      maxPoints != null ? points.slice(0, maxPoints) : [...points]
    const n = data.length
    if (n === 0) {
      return {
        data: [] as UvHourlyPoint[],
        linePath: '',
        areaPath: '',
        dots: [] as { cx: number; cy: number; label: string; uv: number }[],
        xLabels: [] as { x: number; text: string }[],
        yTicks: [] as { y: number; val: number }[],
        nowLineX: null as number | null,
      }
    }

    const maxUv = Math.max(...data.map((p) => p.uv), 0)
    const yTop = Math.max(Math.ceil(maxUv + 1), 6)

    const gw = VB_W - PAD_L - PAD_R
    const gh = VB_H - PAD_T - PAD_B
    const denom = Math.max(n - 1, 1)

    const xFor = (i: number) => PAD_L + (i / denom) * gw
    const yFor = (uv: number) => PAD_T + gh * (1 - Math.min(uv / yTop, 1))

    const linePath =
      n === 1
        ? `M ${(xFor(0) - 2).toFixed(2)} ${yFor(data[0].uv).toFixed(2)} L ${(xFor(0) + 2).toFixed(2)} ${yFor(data[0].uv).toFixed(2)}`
        : data
            .map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(p.uv).toFixed(2)}`,
            )
            .join(' ')

    const areaPath = [
      `M ${xFor(0).toFixed(2)} ${(PAD_T + gh).toFixed(2)}`,
      ...data.map((p, i) => `L ${xFor(i).toFixed(2)} ${yFor(p.uv).toFixed(2)}`),
      `L ${xFor(n - 1).toFixed(2)} ${(PAD_T + gh).toFixed(2)}`,
      'Z',
    ].join(' ')

    const dots = data.map((p, i) => ({
      cx: xFor(i),
      cy: yFor(p.uv),
      label: p.label,
      uv: p.uv,
    }))

    const targetTicks = 7
    const step = Math.max(1, Math.round(n / targetTicks))
    const xLabels: { x: number; text: string }[] = []
    for (let i = 0; i < n; i += step) {
      xLabels.push({ x: xFor(i), text: data[i].label })
    }
    if (n > 1) {
      const last = n - 1
      if (!xLabels.some((l) => l.text === data[last].label)) {
        xLabels.push({ x: xFor(last), text: data[last].label })
      }
    }

    const yTickVals = [0, Math.round(yTop / 2), yTop]
    const yTicks = yTickVals.map((val) => ({
      val,
      y: yFor(val),
    }))

    const nowMs = nowAt.getTime()
    const t0 = data[0].at.getTime()
    const tEnd = data[n - 1].at.getTime()
    let nowLineX: number | null = null
    if (n === 1) {
      nowLineX = xFor(0)
    } else if (tEnd > t0) {
      if (nowMs <= t0) {
        nowLineX = xFor(0)
      } else if (nowMs >= tEnd) {
        nowLineX = xFor(n - 1)
      } else {
        for (let i = 0; i < n - 1; i++) {
          const a = data[i].at.getTime()
          const b = data[i + 1].at.getTime()
          if (nowMs >= a && nowMs <= b) {
            const span = b - a || 1
            const frac = (nowMs - a) / span
            nowLineX = xFor(i) + frac * (xFor(i + 1) - xFor(i))
            break
          }
        }
      }
    }

    return { data, linePath, areaPath, dots, xLabels, yTicks, nowLineX }
  }, [points, maxPoints, nowAt])

  if (data.length === 0) return null

  const gh = VB_H - PAD_T - PAD_B
  const nowLabel = nowAt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const summary = data
    .map((p) => `${p.label}: UV ${p.uv.toFixed(1)}`)
    .join('; ')

  return (
    <div className="home-uv-chart" ref={chartRef}>
      <svg
        ref={svgRef}
        className="home-uv-chart-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`UV index for the full day, local time. Current time about ${nowLabel}. ${summary}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(94, 234, 212, 0.45)" />
            <stop offset="55%" stopColor="rgba(251, 191, 36, 0.12)" />
            <stop offset="100%" stopColor="rgba(94, 234, 212, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map(({ y, val }) => (
          <g key={val}>
            <line
              x1={PAD_L}
              x2={VB_W - PAD_R}
              y1={y}
              y2={y}
              className="home-uv-chart-grid"
            />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              className="home-uv-chart-axis"
            >
              {val}
            </text>
          </g>
        ))}

        <path d={areaPath} className="home-uv-chart-area" fill={`url(#${gradId})`} />
        <path d={linePath} className="home-uv-chart-line" fill="none" />

        {dots.map((d, i) => (
          <g key={i} className="home-uv-chart-dot-group">
            <circle
              cx={d.cx}
              cy={d.cy}
              r={18}
              fill="transparent"
              className="home-uv-chart-dot-hit"
              onMouseEnter={() => placeDotTip(d)}
              onMouseLeave={hideDotTip}
            >
              <title>{`${d.label} — UV index ${d.uv.toFixed(1)}`}</title>
            </circle>
            <circle
              cx={d.cx}
              cy={d.cy}
              r={6}
              className="home-uv-chart-dot"
              pointerEvents="none"
            />
          </g>
        ))}

        {nowLineX != null && (
          <g className="home-uv-chart-now-group">
            <title>{`Current time about ${nowLabel}`}</title>
            <line
              x1={nowLineX}
              x2={nowLineX}
              y1={PAD_T}
              y2={PAD_T + gh}
              className="home-uv-chart-now"
            />
            <text
              x={nowLineX}
              y={PAD_T - 6}
              textAnchor="middle"
              className="home-uv-chart-now-label"
            >
              Now
            </text>
          </g>
        )}

        {xLabels.map((l, i) => (
          <text
            key={`${l.text}-${i}`}
            x={l.x}
            y={VB_H - 16}
            textAnchor="middle"
            className="home-uv-chart-axis home-uv-chart-axis--x"
          >
            {l.text}
          </text>
        ))}

        <text
          x={PAD_L - 8}
          y={PAD_T - 4}
          textAnchor="end"
          className="home-uv-chart-axis home-uv-chart-unit"
        >
          UV
        </text>
      </svg>
      {dotTip && (
        <div
          className="home-uv-chart-tooltip"
          style={{ left: dotTip.left, top: dotTip.top }}
          role="tooltip"
        >
          <span className="home-uv-chart-tooltip-uv">{dotTip.uv.toFixed(1)}</span>
          <span className="home-uv-chart-tooltip-suffix"> UV index</span>
          <span className="home-uv-chart-tooltip-time">{dotTip.label}</span>
        </div>
      )}
    </div>
  )
}
