import { NavLink } from 'react-router-dom'

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
      </div>
    </nav>
  )
}
