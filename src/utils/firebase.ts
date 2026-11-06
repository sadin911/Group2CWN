import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
  browserPopupRedirectResolver,
  signInAnonymously,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAbY6AmE9EkIcQ0H3GNUTJ6fdiP9Yrlpxk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pokecount-tracker.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pokecount-tracker',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pokecount-tracker.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '794583302773',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:794583302773:web:a20f2697d19b21c0e2ee3c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-BNNXCMKZZ9',
};

// Initialize Firebase (Singleton pattern to prevent duplicate init during hot reload)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to ensure Google account picker is always prompt
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure local persistence to ensure credentials stay stored in localStorage
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase setPersistence warning:', err);
  });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: any) {
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error('Google Sign-In Error:', error);
    }
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

/**
 * Ensures user has an authentication identity for Playmat (Google user or Firebase anonymous auth)
 */
export async function ensurePlaymatAuth(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const existing = auth.currentUser as any;
    if (existing) {
      return existing.uid;
    }
    const cred = await Promise.race<any>([
      signInAnonymously(auth),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    const finalUser = (cred?.user || auth.currentUser) as any;
    return finalUser?.uid || null;
  } catch (err) {
    console.warn('[Firebase] Anonymous auth skipped or failed:', err);
    const fallbackUser = auth.currentUser as any;
    return fallbackUser?.uid || null;
  }
}

