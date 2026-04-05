import { Outlet, useLocation } from 'react-router-dom'
import HeroWave from '@/components/ui/dynamic-wave-canvas-background'
import { MiniNavbar } from '@/components/ui/mini-navbar'
import { FirstVisitGate } from './FirstVisitGate'

export function AppLayout() {
  const { pathname } = useLocation()
  const homeBleed = pathname === '/'

  return (
    <FirstVisitGate>
      <div className="app relative isolate">
        <HeroWave />
        <div className="relative z-10 flex min-h-svh flex-1 flex-col pt-[6.5rem]">
          <MiniNavbar />

          <div
            className={
              homeBleed
                ? 'shell shell--with-nav shell--home-bleed flex-1'
                : 'shell shell--with-nav flex-1'
            }
          >
            <main className="page-main">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </FirstVisitGate>
  )
}
