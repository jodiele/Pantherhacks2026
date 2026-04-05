import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const navLinksData = [
  { label: 'Home', to: '/', end: true as const },
  { label: 'UV Planner', to: '/uv', end: false as const },
  { label: 'Skin Scanner', to: '/scan', end: false as const },
  { label: 'Coverage Map', to: '/coverage', end: false as const },
  { label: 'Learn', to: '/learn', end: false as const },
  { label: 'Resources', to: '/resources', end: false as const },
] as const

function AnimatedNavLink({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
}) {
  const location = useLocation()
  const isActive =
    end === true
      ? location.pathname === '/'
      : location.pathname === to

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-sm transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 lg:px-1.5 lg:text-base ${
        isActive
          ? 'font-bold text-teal-300 underline decoration-teal-400 decoration-2 underline-offset-[6px] hover:text-white hover:decoration-white'
          : 'font-normal text-gray-300 no-underline hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

function NavbarAuthActions({
  variant,
  showLogOut,
  onCloseMenu,
  onLogOut,
}: {
  variant: 'row' | 'col'
  showLogOut: boolean
  onCloseMenu: () => void
  onLogOut: () => void | Promise<void>
}) {
  const wrapClass =
    variant === 'row'
      ? 'flex shrink-0 items-center gap-2 md:gap-2.5'
      : 'flex w-full flex-col items-center gap-4'

  if (showLogOut) {
    return (
      <div className={wrapClass}>
        <button
          type="button"
          onClick={() => void onLogOut()}
          className="w-full rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-4 py-2 text-sm text-gray-300 transition-colors duration-200 hover:border-white/50 hover:text-white sm:w-auto sm:px-3 sm:text-base"
        >
          Log out
        </button>
      </div>
    )
  }
  return (
    <div className={wrapClass}>
      <Link
        to="/auth"
        onClick={onCloseMenu}
        className="w-full whitespace-nowrap rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-3 py-2 text-center text-sm text-gray-300 transition-colors duration-200 hover:border-white/50 hover:text-white sm:w-auto sm:px-3.5 sm:text-base"
      >
        Sign in
      </Link>
      <div className="group relative w-full sm:w-auto">
        <div
          className="pointer-events-none absolute inset-0 -m-2 hidden rounded-full bg-teal-400/40 opacity-60 blur-md transition-all duration-300 ease-out group-hover:-m-2.5 group-hover:opacity-90 group-hover:blur-lg sm:block"
          aria-hidden
        />
        <Link
          to="/auth"
          onClick={onCloseMenu}
          className="relative z-10 flex w-full items-center justify-center whitespace-nowrap rounded-full border border-teal-300/50 bg-[#5FC3AF] px-3 py-2 text-center text-sm font-semibold !text-zinc-950 shadow-sm transition-colors duration-200 hover:border-teal-200/60 hover:bg-[#6dccc0] sm:w-auto sm:px-3.5 sm:text-base"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}

export function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, firebaseReady, authLoading } = useAuth()

  const closeMenu = () => setIsOpen(false)

  const headerShapeClass = isOpen ? 'rounded-xl' : 'rounded-full'

  const showLogOut = firebaseReady && !authLoading && Boolean(user)

  async function handleLogOutClick() {
    closeMenu()
    try {
      await signOut()
    } catch {
      /* surfaced in auth page if needed */
    }
    navigate('/auth', { replace: true })
  }

  const logoElement = (
    <Link
      to="/"
      onClick={closeMenu}
      className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
      aria-label="Suntology home"
    >
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gray-200 opacity-80" />
        <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gray-200 opacity-80" />
        <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gray-200 opacity-80" />
        <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gray-200 opacity-80" />
      </div>
      <span className="hidden font-semibold text-base text-white/90 sm:inline">
        Suntology
      </span>
    </Link>
  )

  return (
    <header
      className={`fixed left-1/2 top-6 z-30 flex w-[min(72rem,calc(100vw-1.25rem))] max-w-[72rem] -translate-x-1/2 transform flex-col items-stretch border border-[#333] bg-[#1f1f1f57] py-3 pl-4 pr-4 backdrop-blur-sm transition-[border-radius] duration-0 ease-in-out sm:pl-5 sm:pr-5 lg:pl-6 lg:pr-6 ${headerShapeClass}`}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 md:flex-nowrap md:gap-x-4 lg:gap-x-7">
        <div className="z-10 flex shrink-0 items-center">{logoElement}</div>

        <nav
          className="hidden min-w-0 flex-1 justify-start overflow-x-auto overscroll-x-contain md:flex md:px-2 lg:px-3 [&::-webkit-scrollbar]:h-0"
          aria-label="Main"
        >
          <div className="flex w-max items-center gap-x-5 whitespace-nowrap lg:gap-x-7">
            {navLinksData.map((link) => (
              <AnimatedNavLink key={link.to} to={link.to} end={link.end}>
                {link.label}
              </AnimatedNavLink>
            ))}
          </div>
        </nav>

        <div className="z-10 hidden shrink-0 md:block">
          <NavbarAuthActions
            variant="row"
            showLogOut={showLogOut}
            onCloseMenu={closeMenu}
            onLogOut={handleLogOutClick}
          />
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-gray-300 focus:outline-none md:hidden"
          onClick={() => setIsOpen((o) => !o)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" strokeWidth={2} /> : <Menu className="h-6 w-6" strokeWidth={2} />}
        </button>
      </div>

      <div
        className={`flex w-full flex-col items-center overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          isOpen
            ? 'max-h-[1000px] pt-4 opacity-100'
            : 'pointer-events-none max-h-0 pt-0 opacity-0'
        }`}
      >
        <nav className="flex w-full flex-col items-center space-y-4 text-lg" aria-label="Main mobile">
          {navLinksData.map((link) => {
            const isActive =
              link.end === true
                ? location.pathname === '/'
                : location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full py-1.5 text-center transition-colors duration-200 ${
                  isActive
                    ? 'font-bold text-teal-300 underline decoration-teal-400 decoration-2 underline-offset-[6px]'
                    : 'font-normal text-gray-300 no-underline hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-4 w-full">
          <NavbarAuthActions
            variant="col"
            showLogOut={showLogOut}
            onCloseMenu={closeMenu}
            onLogOut={handleLogOutClick}
          />
        </div>
      </div>
    </header>
  )
}
