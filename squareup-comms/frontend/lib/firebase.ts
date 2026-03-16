/**
 * Firebase client SDK initialization for SquareUp Comms.
 *
 * Provides Google sign-in and sign-out helpers.
 * Config is read from NEXT_PUBLIC_FIREBASE_* environment variables.
 *
 * When NEXT_PUBLIC_ENABLE_DEV_AUTH=true and no API key is set,
 * Firebase is not initialized and all exports are safe no-ops.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOutFn,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

// Only initialize Firebase when a real API key is available.
// In dev mode (no keys), we skip initialization entirely to avoid crashes.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (apiKey) {
  const firebaseConfig = {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { auth };

const googleProvider = apiKey ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.addScope("email");
  googleProvider.addScope("profile");
}

/** Open the Google sign-in popup and return the credential. */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!auth || !googleProvider) {
    throw new Error("Firebase is not initialized (dev mode).");
  }
  return signInWithPopup(auth, googleProvider);
}

/** Sign the current user out of Firebase. */
export async function firebaseSignOut(): Promise<void> {
  if (!auth) return;
  return firebaseSignOutFn(auth);
}
