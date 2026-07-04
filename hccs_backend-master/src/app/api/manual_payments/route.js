// GET /api/manual_payments — list manual payment declarations.
// Query: ?status=pending|approved|rejected|all (default: pending)
//
// Returns rows with denormalised plan + user details so the admin UI can render
// without extra round-trips.

import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { error: authError } = await requireStaff();
    if (authError) return authError;

    unstable_noStore();
    const url = new URL(req.url);
    const status = (url.searchParams.get('status') || 'pending').toLowerCase();
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 200);

    const supabase = createAdminClient();
    let query = supabase
        .from('manual_payment')
        .select(`
            id, user_id, subscription_plan_id, amount, currency,
            declared_email, declared_at, reference, note, status,
            reviewed_by, reviewed_at, reviewer_note,
            user_subscription_id, payment_transaction_id, created_at,
            plan:subscription_plan(id, plan_name, billing_cycle, user_tier_id)
        `)
        .order('declared_at', { ascending: false })
        .limit(limit);

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ status: false, message: error.message });

    // Tack on auth email for each row in one batch (best-effort — falls back to declared_email).
    const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id).filter(Boolean)));
    const emailMap = {};
    if (userIds.length > 0) {
        const { data: users } = await supabase
            .from('user')
            .select('id, email, name')
            .in('id', userIds);
        for (const u of users ?? []) emailMap[u.id] = { email: u.email, name: u.name };
    }
    const rows = (data ?? []).map((r) => ({
        ...r,
        registered_email: emailMap[r.user_id]?.email ?? null,
        registered_name: emailMap[r.user_id]?.name ?? null,
    }));

    return NextResponse.json({ status: true, data: rows });
}
