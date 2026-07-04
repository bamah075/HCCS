// POST /api/subscriptions/action
// Body: { id: number, action: 'extend'|'suspend'|'resume'|'cancel', days?: number, reason?: string }
//
// extend  → adds `days` (default 7) to ends_at; resets grace_until if present.
// suspend → status = 'suspended', records suspended_at + suspended_reason.
//           Tier is NOT demoted (kept for resume); admin can demote separately if needed.
// resume  → status = 'active' (if previously suspended). ends_at unchanged.
// cancel  → status = 'cancelled', tier demoted to Free (id=1).

import { NextResponse } from "next/server";
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const VALID_ACTIONS = new Set(['extend', 'suspend', 'resume', 'cancel']);
const KIND_BY_ACTION = {
    extend: 'extended_by_admin',
    suspend: 'suspended_by_admin',
    resume: 'resumed_by_admin',
    cancel: null,
};

export async function POST(req) {
    const { user: reviewer, error: authError } = await requireStaff();
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    const action = String(body.action || '').toLowerCase();
    const days = Math.min(Math.max(Number(body.days) || 7, 1), 365);
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';

    if (!id) return NextResponse.json({ status: false, message: 'id required' }, { status: 400 });
    if (!VALID_ACTIONS.has(action)) {
        return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: sub, error: subErr } = await supabase
        .from('user_subscription')
        .select('id, user_id, subscription_plan_id, status, ends_at, grace_until, plan:subscription_plan(user_tier_id)')
        .eq('id', id)
        .single();
    if (subErr || !sub) return NextResponse.json({ status: false, message: 'Not found' }, { status: 404 });

    const now = new Date();
    const update = { updated_at: now.toISOString() };

    if (action === 'extend') {
        const base = sub.ends_at ? new Date(sub.ends_at) : now;
        const extended = new Date(base.getTime() + days * 24 * 3600 * 1000);
        update.ends_at = extended.toISOString();
        update.grace_until = null;
        // Promote past_due back to active when extended into the future.
        if (sub.status === 'past_due' && extended > now) {
            update.status = 'active';
        }
    } else if (action === 'suspend') {
        if (sub.status === 'cancelled' || sub.status === 'expired') {
            return NextResponse.json({ status: false, message: `Cannot suspend from ${sub.status}` }, { status: 409 });
        }
        update.status = 'suspended';
        update.suspended_at = now.toISOString();
        update.suspended_reason = reason || null;
    } else if (action === 'resume') {
        if (sub.status !== 'suspended') {
            return NextResponse.json({ status: false, message: `Cannot resume from ${sub.status}` }, { status: 409 });
        }
        update.status = sub.ends_at && new Date(sub.ends_at) > now ? 'active' : 'past_due';
        update.suspended_at = null;
        update.suspended_reason = null;
    } else if (action === 'cancel') {
        update.status = 'cancelled';
        update.ends_at = now.toISOString();
    }

    const { data: updated, error: updErr } = await supabase
        .from('user_subscription')
        .update(update)
        .eq('id', id)
        .select()
        .single();
    if (updErr) return NextResponse.json({ status: false, message: updErr.message }, { status: 500 });

    // On cancel: demote tier to Free.
    if (action === 'cancel' && sub.plan?.user_tier_id) {
        await supabase.from('user').update({ user_tier_id: 1 }).eq('id', sub.user_id);
    }

    // Audit log
    const kind = KIND_BY_ACTION[action];
    if (kind) {
        await supabase.from('subscription_notification').insert({
            user_subscription_id: id,
            user_id: sub.user_id,
            kind,
            channel: 'admin_action',
            payload: { action, days: action === 'extend' ? days : undefined, reason: reason || undefined, by: reviewer.id },
            success: true,
        });
    }

    return NextResponse.json({ status: true, data: updated });
}
