import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase'
import { mapFirebaseAuthError } from '@/lib/mapFirebaseAuthError'

type AuthContextValue = {
  /** True until first Firebase auth state is known (skipped if Firebase isn’t configured). */
  authLoading: boolean
  /** Set when Firebase app init fails (bad env values, etc.). */
  authInitError: string | null
  user: User | null
  firebaseReady: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(() => isFirebaseConfigured())
  const [authInitError, setAuthInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthLoading(false)
      setAuthInitError(null)
      return
    }

    setAuthInitError(null)
    try {
      const auth = getFirebaseAuth()
      const unsub = onAuthStateChanged(auth, (next) => {
        setUser(next)
        setAuthLoading(false)
      })
      return () => unsub()
    } catch (e) {
      console.error(e)
      setAuthLoading(false)
      setAuthInitError(
        'Firebase failed to start. Check .env.local for typos and restart the dev server.',
      )
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const auth = getFirebaseAuth()
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      throw new Error(mapFirebaseAuthError(e))
    }
  }, [])

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        const auth = getFirebaseAuth()
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
        const name = displayName?.trim()
        if (name) {
          await updateProfile(cred.user, { displayName: name })
        }
      } catch (e) {
        throw new Error(mapFirebaseAuthError(e))
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    try {
      const auth = getFirebaseAuth()
      await firebaseSignOut(auth)
    } catch (e) {
      throw new Error(mapFirebaseAuthError(e))
    }
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const auth = getFirebaseAuth()
      await sendPasswordResetEmail(auth, email.trim())
    } catch (e) {
      throw new Error(mapFirebaseAuthError(e))
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      authLoading,
      authInitError,
      user,
      firebaseReady: isFirebaseConfigured(),
      signInWithEmail,
      signUpWithEmail,
      signOut,
      sendPasswordResetEmail: sendPasswordReset,
    }),
    [
      authLoading,
      authInitError,
      user,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      sendPasswordReset,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
