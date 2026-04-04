import {
  CANCER_AWARENESS_INTRO,
  CANCER_AWARENESS_POINTS,
  CANCER_RESOURCES,
  SUN_EXPOSURE_POINTS,
} from '../sunburn'

export function LearnPage() {
  return (
    <div className="page">
      <section className="section section--page" aria-labelledby="exposure-heading">
        <h2 id="exposure-heading" className="section-title">
          Sun exposure
        </h2>
        <p className="section-lead">
          Short sessions add up. Thinking in <strong>doses</strong> of UV—not just “did I burn
          today?”—helps protect skin over years.
        </p>
        <div className="panel education-panel">
          <ul className="education-list">
            {SUN_EXPOSURE_POINTS.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--page" aria-labelledby="cancer-heading">
        <h2 id="cancer-heading" className="section-title">
          UV, sunburn, and skin cancer awareness
        </h2>
        <p className="section-lead">
          Most skin cancers are linked to UV damage. Sunburns are a clear warning sign, but{' '}
          <strong>cumulative exposure</strong> matters even without a painful burn.
        </p>
        <div className="panel awareness-panel">
          <p className="awareness-intro">{CANCER_AWARENESS_INTRO}</p>
          <ul className="tip-list awareness-bullets">
            {CANCER_AWARENESS_POINTS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="resources-label">Trusted references</p>
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
      </section>
    </div>
  )
}
