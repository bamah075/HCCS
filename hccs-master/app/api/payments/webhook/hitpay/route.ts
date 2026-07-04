import { NextResponse } from "next/server";
import { verifyHitPayWebhookSignature } from "@/lib/payments/hitpay";
import { finalizePaymentByPlanId } from "@/lib/payments/finalize";

/**
 * HitPay webhook receiver.
 *
 * HitPay POSTs form-urlencoded data here after the buyer completes payment on
 * the hosted checkout. Body fields include:
 *   payment_id, payment_request_id, status, amount, currency, reference_number,
 *   email, hmac
 *
 * The `hmac` field is computed as HMAC-SHA256 over the alphabetically-sorted
 * concatenation of (key + value) pairs (excluding hmac), keyed with
 * HITPAY_API_SALT. We verify the signature before doing anything.
 *
 * The reference_number was set by createIntent as: "user:<userId>|plan:<planId>"
 *
 * This route is idempotent — finalizePayment dedupes on gateway_payment_id.
 */
export async function POST(req: Request) {
    const salt = process.env.HITPAY_API_SALT;
    if (!salt) {
        console.error("[hitpay webhook] HITPAY_API_SALT not set, rejecting.");
        return new NextResponse("server not configured", { status: 503 });
    }

    let formText: string;
    try {
        formText = await req.text();
    } catch {
        return new NextResponse("invalid body", { status: 400 });
    }

    const params = new URLSearchParams(formText);
    const body: Record<string, string> = {};
    for (const [k, v] of params.entries()) body[k] = v;

    const providedHmac = body.hmac;
    if (!providedHmac) {
        console.warn("[hitpay webhook] missing hmac field");
        return new NextResponse("missing hmac", { status: 400 });
    }
    if (!verifyHitPayWebhookSignature(body, providedHmac, salt)) {
        console.warn("[hitpay webhook] HMAC verification failed");
        return new NextResponse("invalid signature", { status: 401 });
    }

    const status = (body.status ?? "").toLowerCase();
    // Only act on terminal states. HitPay also sends "pending" / "requires_action"
    // events that we just acknowledge.
    if (status !== "completed" && status !== "succeeded") {
        return NextResponse.json({ ok: true, ignored: status });
    }

    const intentId = body.payment_request_id || body.payment_id || null;
    const reference = body.reference_number ?? "";
    const userMatch = /user:([^|]+)/.exec(reference);
    const planMatch = /plan:(\d+)/.exec(reference);
    if (!userMatch || !planMatch) {
        console.error("[hitpay webhook] reference_number missing user/plan ids:", reference);
        return new NextResponse("bad reference", { status: 400 });
    }
    const userId = userMatch[1];
    const planId = Number(planMatch[1]);

    const result = await finalizePaymentByPlanId({
        userId,
        planId,
        gateway: "hitpay",
        intentId,
        gatewayStatus: "paid",
        gatewayRaw: body.status ?? null,
    });

    if (!result.ok) {
        console.error("[hitpay webhook] finalize failed:", result.error);
        // Return 200 anyway so HitPay doesn't retry indefinitely on logic
        // errors. The error is logged for ops to investigate.
        return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({ ok: true, subscription_id: result.subscriptionId });
}
