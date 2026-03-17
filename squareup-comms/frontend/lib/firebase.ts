/**
 * Firebase client SDK initialization for SquareUp Comms.
 *
 * Provides email/password sign-in and sign-out helpers.
 * Config is read from NEXT_PUBLIC_FIREBASE_* environment variables.
 *
 * When no API key is set, Firebase is not initialized and all exports are safe no-ops.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOutFn,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Only initialize Firebase when a real API key is available.
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

/** Sign in with email and password. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  if (!auth) {
    throw new Error("Firebase is not initialized.");
  }
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign the current user out of Firebase. */
export async function firebaseSignOut(): Promise<void> {
  if (!auth) return;
  return firebaseSignOutFn(auth);
}
