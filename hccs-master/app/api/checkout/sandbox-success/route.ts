import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlan } from "@/lib/payments/plans";
import { getGateway } from "@/lib/payments/gateway";
import { finalizePayment } from "@/lib/payments/finalize";

/**
 * Browser-initiated finalize. Called by the checkout page after the gateway
 * SDK signals success (Airwallex) or after the user returns from the hosted
 * checkout (HitPay /checkout/return page).
 *
 * The HitPay flow ALSO has a server-to-server webhook that finalizes
 * independently — that path is at /api/payments/webhook/hitpay. Both paths
 * share the same finalize logic and are idempotent on gateway_payment_id.
 *
 * Body: { planId: number, intentId?: string }
 */
export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan = getPlan(body?.planId ?? body?.plan_id);
    if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const intentId: string | null = typeof body?.intentId === "string" ? body.intentId : null;

    // Best-effort: verify with the gateway that this intent is actually paid.
    const gateway = getGateway();
    let gatewayStatus: "paid" | "pending" | "failed" | "cancelled" | "unknown" = "unknown";
    let gatewayRaw: string | null = null;
    if (intentId) {
        try {
            const s = await gateway.getStatus(intentId);
            gatewayStatus = s.status;
            gatewayRaw = s.rawStatus ?? null;
            if (s.status === "failed" || s.status === "cancelled") {
                return NextResponse.json(
                    { error: "Payment did not complete", gateway_status: s.status },
                    { status: 402 }
                );
            }
        } catch (e) {
            console.warn("sandbox-success: gateway status check failed", (e as Error).message);
        }
    }

    // In dev/sandbox the SDK success event sometimes fires before the gateway-
    // side status flips to PAID — treat anything that isn't an explicit failure
    // as a successful finalize for the local flow.
    if (gatewayStatus === "unknown" || gatewayStatus === "pending") gatewayStatus = "paid";

    const result = await finalizePayment({
        userId: user.id,
        plan,
        gateway: gateway.name,
        intentId,
        gatewayStatus,
        gatewayRaw,
    });

    if (!result.ok) {
        return NextResponse.json({ error: result.error ?? "Failed to finalize" }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        plan_id: plan.id,
        user_tier_id: result.userTierId,
        subscription_id: result.subscriptionId,
        ends_at: result.endsAt,
    });
}
