// Audit-log helper. Call from every privileged Route Handler after a
// successful state change.
//
// Pattern:
//   const { user, error } = await requireAdmin();
//   if (error) return error;
//   // ... do the action ...
//   await logAction(req, user, { action: 'news.delete', target_table: 'news', target_id: id });

import 'server-only';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function logAction(req, actor, { action, target_table = null, target_id = null, before = null, after = null }) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      target_table,
      target_id: target_id != null ? String(target_id) : null,
      before_data: before,
      after_data: after,
      ip: req?.headers?.get?.('x-forwarded-for')?.split(',')?.[0]?.trim() || null,
      user_agent: req?.headers?.get?.('user-agent') || null,
    });
  } catch (e) {
    // Never let an audit-log failure mask the actual response.
    // Log to stderr for ops visibility.
    console.error('audit_log insert failed:', e?.message ?? e);
  }
}
