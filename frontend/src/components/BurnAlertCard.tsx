import type { BurnAlert } from '../sunburn'

export function BurnAlertCard({ alert }: { alert: BurnAlert }) {
  return (
    <div
      className={`burn-alert burn-alert--${alert.level}`}
      role="status"
    >
      <p className="burn-alert-head">{alert.headline}</p>
      <p className="burn-alert-body">{alert.body}</p>
    </div>
  )
}
