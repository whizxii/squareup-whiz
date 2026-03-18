/**
 * Supabase client SDK initialization for SquareUp Comms.
 *
 * Provides email/password sign-in and sign-out helpers.
 * Config is read from NEXT_PUBLIC_SUPABASE_* environment variables.
 *
 * When no URL is set, Supabase is not initialized and all exports are safe no-ops.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only initialize Supabase when real credentials are available.
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

/** Sign in with email and password. Returns the session data. */
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase is not initialized.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
}

/** Sign the current user out of Supabase. */
export async function supabaseSignOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
