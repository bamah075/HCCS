// Server-side Supabase client that reads the user's session cookie.
// Use this when you need to know WHO is calling (RLS is enforced).
//
// For privileged operations after auth check, use createAdminClient() instead.

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // no-op in Route Handlers; cookie setting happens via Response headers
        },
        remove() {
          // no-op
        },
      },
    }
  );
}
