// Server-only Supabase client with service_role privileges.
// Importing this from a 'use client' component throws a build error.
//
// Use this for privileged DB operations inside Route Handlers, Server Actions,
// or Server Components — never reachable from the browser.

import 'server-only';
import { createClient } from '@supabase/supabase-js';

let cached;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
