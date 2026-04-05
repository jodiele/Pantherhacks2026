import { type FormEvent, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import './AuthPage.css'

const SIDE_IMAGE =
  'https://images.unsplash.com/photo-1538137524007-21e48fa42f3f?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=ac9fa0975bd2ebad7afd906c5a3a15ab&auto=format&fit=crop&w=1200&q=80'

export function AuthPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const titleId = useId()
  const descId = useId()
  const dialogId = useId()

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter email and password.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return
    }
    // UI-only: wire to your API later
    setError(null)
  }

  return (
    <div className="auth-page">
      <Link className="auth-back" to="/">
        ← Back to Suntology
      </Link>

      <div className="container" aria-hidden={isOpen}>
        <div className="scroll-down">
          Scroll down
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 17.5L5 9h14l-7 8.5z" />
          </svg>
        </div>
      </div>

      <div
        className={`modal${isOpen ? ' is-open' : ''}`}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false)
        }}
      >
        <div
          id={dialogId}
          className="modal-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-left">
            <h2 className="modal-title" id={titleId}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </h2>
            <p className="modal-desc" id={descId}>
              {mode === 'login'
                ? 'Welcome back — track UV, scans, and sun safety in one place.'
                : 'Join Suntology to save preferences and get personalized reminders.'}
            </p>

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} noValidate>
              {mode === 'signup' ? (
                <label className="input-block">
                  <span className="input-label">Full name</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                </label>
              ) : null}

              <label className="input-block">
                <span className="input-label">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
              </label>

              <label className="input-block input-block--password">
                <span className="input-label">Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </label>

              <div className="modal-buttons">
                {mode === 'login' ? (
                  <a href="#forgot" onClick={(e) => e.preventDefault()}>
                    Forgot your password?
                  </a>
                ) : (
                  <span />
                )}
                <button type="submit" className="input-button">
                  {mode === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </form>

            <p className="sign-up">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(null) }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(null) }}>
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="modal-right" aria-hidden="true">
            <img src={SIDE_IMAGE} alt="" decoding="async" />
          </div>
        </div>

        <button
          type="button"
          className="modal-button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls={dialogId}
        >
          Let me in
        </button>
      </div>
    </div>
  )
}
