import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="page home-page">
      <section className="section section--page" aria-labelledby="home-welcome-heading">
        <h2 id="home-welcome-heading" className="section-title">
          Welcome
        </h2>
        <p className="section-lead">
          Set your location on the <strong>UV &amp; alerts</strong> tab, then plan around
          today&apos;s peak and hourly curve.
        </p>
        <Link to="/uv" className="btn btn-primary">
          Go to UV &amp; planning
        </Link>
      </section>

      <section
        className="section section--page home-soon-section"
        aria-labelledby="home-soon-heading"
      >
        <h2 id="home-soon-heading" className="section-title">
          Coming next
        </h2>
        <div className="panel home-soon-placeholder">
          <p className="section-lead home-soon-lead">
            This area is reserved—add your next home idea here when you&apos;re ready.
          </p>
        </div>
      </section>
    </div>
  )
}
