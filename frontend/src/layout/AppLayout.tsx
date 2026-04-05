import { Outlet } from 'react-router-dom'
import HeroWave from '@/components/ui/dynamic-wave-canvas-background'
import { MiniNavbar } from '@/components/ui/mini-navbar'
import { FirstVisitGate } from './FirstVisitGate'

export function AppLayout() {
  return (
    <FirstVisitGate>
      <div className="app relative isolate">
        <HeroWave />
        <div className="relative z-10 flex min-h-svh flex-1 flex-col pt-[6.5rem]">
          <MiniNavbar />

          <div className="shell shell--with-nav flex-1">
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
