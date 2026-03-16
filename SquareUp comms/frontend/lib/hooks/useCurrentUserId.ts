import { useAuthStore } from "@/lib/stores/auth-store";

const DEV_USER_ID = "dev-user-001";

/**
 * React hook — returns the current user's ID from the auth store,
 * falling back to the dev user for local development.
 */
export function useCurrentUserId(): string {
  const profile = useAuthStore((s) => s.profile);
  return profile?.firebase_uid ?? DEV_USER_ID;
}

/**
 * Non-reactive getter for use outside React components
 * (stores, API clients, event handlers, etc.).
 */
export function getCurrentUserId(): string {
  const profile = useAuthStore.getState().profile;
  return profile?.firebase_uid ?? DEV_USER_ID;
}
