import type { FirebaseError } from 'firebase/app'

export function mapFirebaseAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as FirebaseError).code)
      : ''

  const messages: Record<string, string> = {
    'auth/invalid-email': 'That email address doesn’t look valid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'Email/password sign-in isn’t enabled for this project.',
    'auth/missing-email': 'Enter your email first.',
  }

  if (code && messages[code]) return messages[code]

  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong. Please try again.'
}
