import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

function readFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

export function isFirebaseConfigured(): boolean {
  const c = readFirebaseConfig()
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId)
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables.')
  }
  if (!app) {
    app = initializeApp(readFirebaseConfig())
  }
  return app
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}
