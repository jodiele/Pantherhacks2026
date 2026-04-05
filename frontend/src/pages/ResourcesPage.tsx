import { CANCER_RESOURCES } from '../sunburn'

/** External docs aligned with what the repo actually uses */
const TECH_DOCS_LINKS = [
  {
    label: 'Open-Meteo — UV index & hourly forecast',
    href: 'https://open-meteo.com/en/docs',
  },
  {
    label: 'WeatherAPI.com — current + week outlook',
    href: 'https://www.weatherapi.com/docs/',
  },
  {
    label: 'Mistral AI — chat API',
    href: 'https://docs.mistral.ai/',
  },
  {
    label: 'OpenAI — alternative chat backend',
    href: 'https://platform.openai.com/docs/overview',
  },
  {
    label: 'Firebase — email/password auth',
    href: 'https://firebase.google.com/docs/auth',
  },
  {
    label: 'MediaPipe Tasks Vision — hand / face demos on the coverage map',
    href: 'https://ai.google.dev/edge/mediapipe/solutions/guide',
  },
  {
    label: 'Flask — Python web framework for the local API',
    href: 'https://flask.palletsprojects.com/en/stable/',
  },
  {
    label: 'PyTorch — model inference for photo scan',
    href: 'https://pytorch.org/docs/stable/index.html',
  },
  {
    label: 'Vite — frontend dev server & build',
    href: 'https://vite.dev/guide/',
  },
] as const

export function ResourcesPage() {
  return (
    <div className="page">
      <section className="section section--page">
        <h2 className="section-title">Resources</h2>

        <div className="panel filler-panel">
          <p className="resources-label">Documentation</p>
          <ul className="resource-links">
            {TECH_DOCS_LINKS.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel filler-panel">
          <p className="resources-label">Trusted health & UV references</p>
          <ul className="resource-links">
            {CANCER_RESOURCES.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer">
                  {r.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="https://www.cdc.gov/niosh/topics/sunexposure/default.html"
                target="_blank"
                rel="noreferrer"
              >
                NIOSH — Sun safety at work (CDC)
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
