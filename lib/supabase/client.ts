"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

/**
 * Browser Supabase client. Returns null in demo mode (no env vars set) so
 * callers can fall back to the local mock store instead of crashing.
 */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
