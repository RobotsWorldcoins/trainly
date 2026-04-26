import { createBrowserClient } from '@supabase/ssr';

/**
 * Use this in Client Components ('use client').
 * createBrowserClient stores the session in cookies (not localStorage),
 * so the server-side createServerClient can read the same session.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
