import { CANCER_RESOURCES } from '../sunburn'

const PLACEHOLDER_LINKS = [
  { label: 'Open-Meteo API docs', href: 'https://open-meteo.com/en/docs' },
  {
    label: 'NIOSH Sun safety (worker-facing)',
    href: 'https://www.cdc.gov/niosh/topics/sunexposure/default.html',
  },
] as const

export function ResourcesPage() {
  return (
    <div className="page filler-page">
      <section className="section section--page">
        <h2 className="section-title">Resources</h2>
        <p className="section-lead">
          External references and placeholders you can extend with your own hackathon
          handouts, sponsor links, or campus health resources.
        </p>

        <div className="panel filler-panel">
          <p className="resources-label">Health & UV (from Learn page)</p>
          <ul className="resource-links">
            {CANCER_RESOURCES.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel filler-panel">
          <p className="resources-label">Technical & data</p>
          <ul className="resource-links">
            {PLACEHOLDER_LINKS.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel filler-panel filler-note">
          <p>
            <strong>Filler slot:</strong> Paste your one-pager PDF, judging demo script, or
            QR code to slides here (or replace this block with a component later).
          </p>
        </div>
      </section>
    </div>
  )
}
