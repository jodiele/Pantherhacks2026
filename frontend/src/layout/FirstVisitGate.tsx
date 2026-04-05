import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasCompletedFirstVisit } from '@/lib/firstVisit'

/**
 * First time someone opens the main app shell, send them to `/auth` once per browser.
 * `markFirstVisitComplete()` runs when `AuthPage` mounts.
 */
export function FirstVisitGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [allowShell, setAllowShell] = useState(hasCompletedFirstVisit)

  useEffect(() => {
    if (hasCompletedFirstVisit()) {
      setAllowShell(true)
      return
    }
    navigate('/auth', { replace: true })
  }, [navigate])

  if (!allowShell) {
    return (
      <div
        className="first-visit-gate"
        style={{
          minHeight: '100svh',
          background: 'var(--bg)',
        }}
        aria-busy="true"
        aria-label="Loading"
      />
    )
  }

  return <>{children}</>
}
