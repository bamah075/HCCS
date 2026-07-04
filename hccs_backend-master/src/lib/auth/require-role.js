// Server-side authorization guards for admin Route Handlers.
// Every privileged route must `await requireAdmin()` (or requireStaff()) as
// the FIRST thing it does, before reading the request body or touching the DB.
//
// Return shape: { user, role, error: null } on success
//                { user: null, role: null, error: Response } on failure
// Callers do: const { error, user, role } = await requireAdmin(); if (error) return error;

import 'server-only';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from 'src/lib/supabase/server';
import { createAdminClient } from 'src/lib/supabase/admin';

async function getCallerProfile() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();
  if (getUserError || !user) {
    return { user: null, role: null, error: NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 }) };
  }
  // Look up the role via admin client (bypasses RLS to avoid any policy issue
  // during the check itself). This is one DB hit per request.
  const admin = createAdminClient();
  const { data: profile } = await admin.from('user').select('role').eq('id', user.id).single();
  return { user, role: profile?.role ?? null, error: null };
}

export async function requireAdmin() {
  const { user, role, error } = await getCallerProfile();
  if (error) return { user: null, role: null, error };
  if (role !== 'admin') {
    return { user: null, role: null, error: NextResponse.json({ status: false, message: 'Forbidden' }, { status: 403 }) };
  }
  return { user, role, error: null };
}

export async function requireStaff() {
  const { user, role, error } = await getCallerProfile();
  if (error) return { user: null, role: null, error };
  if (!['staff', 'admin'].includes(role)) {
    return { user: null, role: null, error: NextResponse.json({ status: false, message: 'Forbidden' }, { status: 403 }) };
  }
  return { user, role, error: null };
}

// Optional helper for any-authenticated routes.
export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, error: null };
}
