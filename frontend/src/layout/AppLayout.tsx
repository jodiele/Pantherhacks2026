import { Outlet } from 'react-router-dom'
import HeroWave from '@/components/ui/dynamic-wave-canvas-background'
import { NavTabs } from '../components/NavTabs'
import { FirstVisitGate } from './FirstVisitGate'

export function AppLayout() {
  return (
    <FirstVisitGate>
      <div className="app relative isolate">
        <HeroWave />
        <div className="relative z-10 flex min-h-svh flex-1 flex-col">
          <div className="disclaimer">
            <strong>Not medical advice.</strong> Suntology shares UV-based burn alerts, informal
            photo hints, and cancer-risk education for awareness only. It does not diagnose
            sunburn, skin cancer, or any disease—see a qualified clinician for evaluation.
          </div>

          <div className="shell shell--with-nav flex-1">
            <header className="brand brand--compact">
              <p className="tagline">PantherHacks · Suntology</p>
              <h1>Suntology</h1>
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
      </div>
    </FirstVisitGate>
  )
}
