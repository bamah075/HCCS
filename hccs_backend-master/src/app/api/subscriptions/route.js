// GET /api/subscriptions — list subscriptions with filters.
// Query: ?status=active|past_due|suspended|expired|cancelled|expiring_soon|all
//        ?days=N (for expiring_soon — default 14)

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
    const status = (url.searchParams.get('status') || 'active').toLowerCase();
    const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 14, 1), 90);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);

    const supabase = createAdminClient();
    let query = supabase
        .from('user_subscription')
        .select(`
            id, user_id, subscription_plan_id, status, starts_at, ends_at,
            grace_until, suspended_at, suspended_reason, auto_renew,
            gateway_subscription_id, created_at,
            plan:subscription_plan(id, plan_name, billing_cycle, amount, user_tier_id),
            user:user(id, email, name, user_tier_id)
        `)
        .order('ends_at', { ascending: true, nullsFirst: false })
        .limit(limit);

    if (status === 'expiring_soon') {
        const now = new Date();
        const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000);
        query = query.in('status', ['active', 'past_due']).lte('ends_at', horizon.toISOString());
    } else if (status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ status: false, message: error.message });

    // Last 3 notifications per subscription, joined in
    const ids = (data ?? []).map((r) => r.id);
    const notifMap = {};
    if (ids.length > 0) {
        const { data: notifs } = await supabase
            .from('subscription_notification')
            .select('id, user_subscription_id, kind, created_at, success')
            .in('user_subscription_id', ids)
            .order('created_at', { ascending: false });
        for (const n of notifs ?? []) {
            (notifMap[n.user_subscription_id] ??= []).push(n);
        }
    }

    return NextResponse.json({
        status: true,
        data: (data ?? []).map((r) => ({
            ...r,
            notifications: (notifMap[r.id] ?? []).slice(0, 3),
        })),
    });
}
