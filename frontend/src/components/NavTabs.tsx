import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const tabs = [
  { to: '/', label: 'Home', end: true as boolean },
  { to: '/uv', label: 'UV & alerts', end: false },
  { to: '/scan', label: 'Photo scan', end: false },
  { to: '/coverage', label: 'Coverage map', end: false },
  { to: '/learn', label: 'Learn', end: false },
  { to: '/about', label: 'About', end: false },
  { to: '/resources', label: 'Resources', end: false },
]

export function NavTabs() {
  const navigate = useNavigate()
  const { user, signOut, firebaseReady, authLoading } = useAuth()

  async function handleLogOut() {
    try {
      await signOut()
    } catch {
      /* surfaced in auth page if needed */
    }
    navigate('/auth', { replace: true })
  }

  const showLogOut = firebaseReady && !authLoading && Boolean(user)

  return (
    <nav className="main-nav" aria-label="Main">
      <div className="nav-tabs">
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-tab${isActive ? ' nav-tab--active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
        {showLogOut ? (
          <button
            type="button"
            className="nav-tab"
            onClick={handleLogOut}
          >
            Log out
          </button>
        ) : (
          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `nav-tab${isActive ? ' nav-tab--active' : ''}`
            }
          >
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  )
}
