import { type FormEvent, useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { markFirstVisitComplete } from '@/lib/firstVisit'
import HeroWave from '@/components/ui/dynamic-wave-canvas-background'
import './AuthPage.css'

export function AuthPage() {
  const navigate = useNavigate()
  const {
    authLoading,
    authInitError,
    user,
    firebaseReady,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendPasswordResetEmail,
  } = useAuth()

  const [isOpen, setIsOpen] = useState(true)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSending, setResetSending] = useState(false)

  const titleId = useId()
  const descId = useId()
  const dialogId = useId()

  useEffect(() => {
    markFirstVisitComplete()
  }, [])

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!firebaseReady) {
      setError('Firebase isn’t configured. Add keys to .env.local (see .env.example).')
      return
    }
    if (!email.trim() || !password) {
      setError('Please enter email and password.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password, name)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError(null)
    setInfo(null)
    if (!firebaseReady) {
      setError('Firebase isn’t configured.')
      return
    }
    if (!email.trim()) {
      setError('Enter your email above, then tap “Forgot your password?” again.')
      return
    }
    setResetSending(true)
    try {
      await sendPasswordResetEmail(email)
      setInfo('Check your inbox for a reset link.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setResetSending(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const showAuthSpinner = firebaseReady && authLoading
  /** Only block the form while a request is in flight — not during initial session check. */
  const busy = submitting
  const submitDisabled = submitting || !firebaseReady

  return (
    <div className="auth-page">
      <HeroWave />

      <Link className="auth-back" to="/">
        ← Back to Suntology
      </Link>

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
            {user && !authLoading ? (
              <>
                <h2 className="modal-title" id={titleId}>
                  You&apos;re signed in
                </h2>
                <p className="modal-desc" id={descId}>
                  {user.displayName
                    ? `Hi, ${user.displayName}.`
                    : 'Your account is active.'}{' '}
                  {user.email ? `(${user.email})` : null}
                </p>
                <div className="auth-signed-in-actions">
                  <button
                    type="button"
                    className="input-button"
                    onClick={() => navigate('/', { replace: true })}
                  >
                    Continue to app
                  </button>
                  <button
                    type="button"
                    className="auth-sign-out-btn"
                    onClick={handleSignOut}
                    disabled={submitting}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title" id={titleId}>
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </h2>
                <p className="modal-desc" id={descId}>
                  {mode === 'login'
                    ? 'Welcome back — track UV, scans, and sun safety in one place.'
                    : 'Join Suntology to save preferences and get personalized reminders.'}
                </p>

                {!firebaseReady ? (
                  <p className="auth-config-notice" role="status">
                    Firebase isn&apos;t set up yet. Copy{' '}
                    <code className="auth-config-code">.env.example</code> to{' '}
                    <code className="auth-config-code">.env.local</code> and add your web app
                    keys from the Firebase console. Enable Email/Password under Authentication →
                    Sign-in method.
                  </p>
                ) : null}

                {showAuthSpinner ? (
                  <p className="auth-config-notice" aria-live="polite">
                    Checking session…
                  </p>
                ) : null}

                {authInitError ? (
                  <p className="auth-error" role="alert">
                    {authInitError}
                  </p>
                ) : null}

                {error ? (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                ) : null}

                {info ? (
                  <p className="auth-info" role="status">
                    {info}
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
                        disabled={busy}
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
                      disabled={busy}
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
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={busy}
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
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={handleForgotPassword}
                        disabled={submitting || resetSending || !firebaseReady}
                      >
                        {resetSending ? 'Sending…' : 'Forgot your password?'}
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="submit" className="input-button" disabled={submitDisabled}>
                      {submitting
                        ? 'Please wait…'
                        : mode === 'login'
                          ? 'Sign in'
                          : 'Sign up'}
                    </button>
                  </div>
                </form>

                <p className="sign-up">
                  {mode === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup')
                          setError(null)
                          setInfo(null)
                        }}
                        disabled={busy}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login')
                          setError(null)
                          setInfo(null)
                        }}
                        disabled={busy}
                      >
                        Log in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>

          <div className="modal-right" aria-hidden="true" />
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
