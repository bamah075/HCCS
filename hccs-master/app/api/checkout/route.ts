import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getGateway } from "@/lib/payments/gateway";
import { getPlan, resolvePlan, type BillingCycle } from "@/lib/payments/plans";

function toShopperCountryCode(input: unknown): string {
    const value = typeof input === "string" ? input.trim().toUpperCase() : "";
    return /^[A-Z]{2}$/.test(value) ? value : "SG";
}

async function authedUser(authToken: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(authToken);
    if (error || !data?.user) return null;
    return data.user;
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!authToken) {
            return NextResponse.json({ error: "Please sign in to continue checkout." }, { status: 401 });
        }
        const user = await authedUser(authToken);
        if (!user) {
            return NextResponse.json({ error: "Please sign in to continue checkout." }, { status: 401 });
        }
        const intentId = req.nextUrl.searchParams.get("intentId")?.trim();
        if (!intentId) {
            return NextResponse.json({ error: "Missing payment intent id." }, { status: 400 });
        }
        const gateway = getGateway();
        const status = await gateway.getStatus(intentId);
        return NextResponse.json({
            status: status.status,
            raw_status: status.rawStatus,
            // legacy field used by the existing checkout page polling:
            latest_payment_attempt_status: status.rawStatus,
        });
    } catch (err) {
        console.error("Checkout status error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!authToken) {
            return NextResponse.json({ error: "Please sign in to continue checkout." }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
        }

        const user = await authedUser(authToken);
        if (!user) {
            return NextResponse.json({ error: "Please sign in to continue checkout." }, { status: 401 });
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: appUser } = await admin
            .from("user").select("id, user_tier_id").eq("id", user.id).single();
        if (!appUser) {
            return NextResponse.json(
                { error: "Please register your account before checking out." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const planKey = typeof body?.plan === "string" ? body.plan : "";
        const billing: BillingCycle = body?.billing_cycle === "monthly" ? "monthly"
            : body?.billing_cycle === "one-time" ? "one-time" : "annual";
        const countryCode = toShopperCountryCode(body?.country_code);

        // If the caller explicitly specifies a planId, it must resolve — we
        // don't silently substitute a default. Only fall back to plan-key
        // resolution when planId was not provided at all.
        const rawPlanId = body?.planId ?? body?.plan_id;
        const plan = rawPlanId != null && rawPlanId !== ""
            ? getPlan(rawPlanId)
            : resolvePlan(planKey, billing);
        if (!plan) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const gateway = getGateway();
        const intent = await gateway.createIntent({
            userId: user.id,
            userEmail: user.email ?? null,
            plan,
            countryCode,
        });

        return NextResponse.json({
            intent_id: intent.intentId,
            client_secret: intent.clientSecret,
            plan_id: plan.id,
            amount: plan.amount,
            currency: plan.currency,
            plan_name: plan.name,
            billing_cycle: plan.cycle,
            country_code: countryCode,
            gateway: intent.gateway,
            // "inpage" → mount the gateway SDK in the checkout page.
            // "redirect" → navigate the browser to client_secret URL.
            flow: intent.flow,
            // Helpful for the upgrade UX — let the client know what tier the
            // user is on today so the page can show "Upgrade from X to Y" copy.
            current_tier_id: appUser.user_tier_id ?? 1,
            target_tier_id: plan.tierId,
        });
    } catch (err) {
        console.error("Checkout error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
