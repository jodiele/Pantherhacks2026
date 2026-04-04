import { Outlet } from 'react-router-dom'
import { NavTabs } from '../components/NavTabs'

export function AppLayout() {
  return (
    <div className="app">
      <div className="disclaimer">
        <strong>Not medical advice.</strong> SunCheck shares UV-based burn alerts, informal
        photo hints, and cancer-risk education for awareness only. It does not diagnose
        sunburn, skin cancer, or any disease—see a qualified clinician for evaluation.
      </div>

      <div className="shell shell--with-nav">
        <header className="brand brand--compact">
          <p className="tagline">PantherHacks · SunCheck</p>
          <h1>SunCheck</h1>
        </header>

        <NavTabs />

        <main className="page-main">
          <Outlet />
        </main>
      </div>

      <footer className="foot">
        UV: Open-Meteo · Image API: Flask + PyTorch · UI: Vite + React · Education only
      </footer>
    </div>
  )
}
