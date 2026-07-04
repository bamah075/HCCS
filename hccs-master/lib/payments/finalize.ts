// Finalize a successful payment: cancel any active subscription, insert the
// new active subscription, log the payment_transaction, upgrade user tier.
//
// Called from two places:
//   - /api/checkout/sandbox-success (browser-initiated, with user auth token)
//   - /api/payments/webhook/hitpay (gateway-initiated, server-trusted)
//
// Both paths converge here so the DB-state changes stay consistent.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPlan, type Plan } from "./plans";
import type { GatewayName } from "./gateway";

export interface FinalizeInput {
    userId: string;
    plan: Plan;
    gateway: GatewayName;
    intentId: string | null;
    /** Normalised status reported by the gateway. */
    gatewayStatus: "paid" | "pending" | "failed" | "cancelled" | "unknown";
    gatewayRaw: string | null;
}

export interface FinalizeResult {
    ok: boolean;
    error?: string;
    subscriptionId?: number | null;
    userTierId?: number | null;
    endsAt?: string | null;
}

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function finalizePayment(input: FinalizeInput): Promise<FinalizeResult> {
    if (input.gatewayStatus === "failed" || input.gatewayStatus === "cancelled") {
        return { ok: false, error: `Payment status: ${input.gatewayStatus}` };
    }

    const admin = adminClient();

    // Sanity check: user row must exist.
    const { data: appUser } = await admin
        .from("user").select("id, user_tier_id").eq("id", input.userId).single();
    if (!appUser) return { ok: false, error: "User not found" };

    const plan = input.plan;
    const now = new Date();
    const startsAt = now.toISOString();
    const endsAt = plan.durationDays
        ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // Idempotency: if a payment_transaction with this gateway_payment_id is
    // already recorded as paid, we've finalized this intent before. Don't
    // duplicate the subscription / transaction / tier change.
    if (input.intentId) {
        const { data: existingTx } = await admin
            .from("payment_transaction")
            .select("id, user_subscription_id")
            .eq("gateway_payment_id", input.intentId)
            .eq("status", "paid")
            .maybeSingle();
        if (existingTx) {
            return {
                ok: true,
                subscriptionId: existingTx.user_subscription_id ?? null,
                userTierId: appUser.user_tier_id ?? null,
                endsAt: null,
            };
        }
    }

    // Close any currently active subscription rows.
    await admin
        .from("user_subscription")
        .update({ status: "cancelled", ends_at: now.toISOString() })
        .eq("user_id", input.userId)
        .eq("status", "active");

    let newSubId: number | null = null;
    if (plan.tierId !== null) {
        const { data: subRow, error: subErr } = await admin
            .from("user_subscription")
            .insert({
                user_id: input.userId,
                subscription_plan_id: plan.id,
                status: "active",
                starts_at: startsAt,
                ends_at: endsAt,
                auto_renew: plan.cycle !== "one-time",
                gateway_subscription_id: input.intentId ?? null,
            })
            .select("id")
            .single();
        if (subErr) return { ok: false, error: `subscription insert: ${subErr.message}` };
        newSubId = subRow?.id ?? null;
    }

    const { error: txErr } = await admin.from("payment_transaction").insert({
        user_id: input.userId,
        user_subscription_id: newSubId,
        subscription_plan_id: plan.cycle === "one-time" ? null : plan.id,
        gateway: input.gateway,
        gateway_payment_id: input.intentId ?? null,
        gateway_status: input.gatewayRaw ?? null,
        amount: plan.amount,
        currency: plan.currency,
        status: "paid",
        paid_at: now.toISOString(),
        raw_response: {
            intent_id: input.intentId ?? null,
            plan_id: plan.id,
            plan_key: plan.key,
            normalised_status: input.gatewayStatus,
        },
    });
    if (txErr) {
        return { ok: false, error: `transaction insert: ${txErr.message}` };
    }

    if (plan.tierId !== null) {
        const { error: updErr } = await admin
            .from("user").update({ user_tier_id: plan.tierId }).eq("id", input.userId);
        if (updErr) return { ok: false, error: `tier update: ${updErr.message}` };
    }

    return {
        ok: true,
        subscriptionId: newSubId,
        userTierId: plan.tierId ?? appUser.user_tier_id ?? null,
        endsAt,
    };
}

/** Convenience wrapper for callers that have a planId rather than a Plan. */
export async function finalizePaymentByPlanId(
    args: Omit<FinalizeInput, "plan"> & { planId: number | string | null | undefined },
): Promise<FinalizeResult> {
    const plan = getPlan(args.planId);
    if (!plan) return { ok: false, error: "Invalid plan" };
    return finalizePayment({ ...args, plan });
}
