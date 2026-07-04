import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS, TIER_NAMES } from "@/lib/payments/plans";

/**
 * Returns the caller's current subscription state.
 * UI uses this to decide between "Subscribe" and "Upgrade" copy.
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const [userRes, subRes] = await Promise.all([
        admin.from("user").select("user_tier_id, full_name").eq("id", user.id).single(),
        admin.from("user_subscription")
            .select("id, subscription_plan_id, status, starts_at, ends_at, auto_renew")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1),
    ]);

    const tierId = (userRes.data?.user_tier_id ?? 1) as number;
    const activeSub = (subRes.data ?? []).find((s) => s.status === "active") ?? null;
    const planMeta = activeSub ? PLANS[activeSub.subscription_plan_id] ?? null : null;

    return NextResponse.json({
        user_id: user.id,
        tier_id: tierId,
        tier_name: TIER_NAMES[tierId] ?? "Free",
        active_subscription: activeSub
            ? {
                id: activeSub.id,
                plan_id: activeSub.subscription_plan_id,
                plan_key: planMeta?.key ?? null,
                plan_name: planMeta?.name ?? null,
                billing_cycle: planMeta?.cycle ?? null,
                status: activeSub.status,
                starts_at: activeSub.starts_at,
                ends_at: activeSub.ends_at,
                auto_renew: activeSub.auto_renew,
            }
            : null,
    });
}
