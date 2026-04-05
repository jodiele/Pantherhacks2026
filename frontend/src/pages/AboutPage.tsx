import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="page filler-page">
      <section className="section section--page">
        <h2 className="section-title">About Suntology</h2>
        <p className="section-lead">
          Suntology is a <strong>PantherHacks 2026</strong> project: a small full-stack demo
          that combines public weather UV data, a Flask + PyTorch image API, and React
          education screens—not a regulated medical device.
        </p>
        <div className="panel filler-panel">
          <p>
            <strong>Stack:</strong> Vite, React, TypeScript, React Router, Open-Meteo (UV),
            Flask, PyTorch.
          </p>
          <p>
            <strong>Model credit:</strong> Inspired by open skin-classification work; see
            repo README for attribution.
          </p>
          <p>
            <strong>Team:</strong> Add your names, roles, and links here for the
            hackathon judges.
          </p>
          <p className="filler-cta">
            <Link to="/uv">Check UV planning</Link>
            {' · '}
            <Link to="/scan">Try photo scan</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
