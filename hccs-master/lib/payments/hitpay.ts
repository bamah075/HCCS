// HitPay implementation of PaymentGateway.
//
// HitPay is a Singapore-based gateway using a hosted-checkout (redirect) flow
// rather than an in-page SDK. createIntent() returns the hosted-checkout URL
// in clientSecret — the checkout page redirects the browser to it. After the
// user pays, HitPay redirects back to redirect_url and (separately) POSTs a
// signed webhook to webhook_url.
//
// Required env vars (when going live):
//   HITPAY_API_KEY      — business API key (sandbox key for testing)
//   HITPAY_API_SALT     — used to verify webhook HMAC signatures
//   HITPAY_ENV          — "sandbox" | "prod" (default: sandbox)
//   PAYMENT_GATEWAY     — set to "hitpay" to activate this adapter
//   NEXT_PUBLIC_SITE_URL — used to build redirect_url + webhook_url
//
// Docs: https://hit-pay.com/docs.html
// Webhook signature scheme:
//   HMAC SHA256 of (alphabetical concat of all non-hmac body keys+values)
//   using HITPAY_API_SALT as the key.

import "server-only";
import { createHmac } from "crypto";
import type {
    PaymentGateway, CreateIntentInput, IntentResult, PaymentStatus, ClientConfig,
} from "./gateway";

function hitpayBaseUrl(): string {
    const env = (process.env.HITPAY_ENV ?? "sandbox").toLowerCase();
    return env === "prod"
        ? "https://api.hit-pay.com/v1"
        : "https://api.sandbox.hit-pay.com/v1";
}

function siteOrigin(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
}

function requireKey(): string {
    const key = process.env.HITPAY_API_KEY;
    if (!key) {
        throw new Error(
            "HITPAY_API_KEY is not set. Add it to .env.local once the HitPay account is provisioned, " +
            "or switch PAYMENT_GATEWAY back to airwallex."
        );
    }
    return key;
}

function normaliseStatus(s: string | undefined): PaymentStatus["status"] {
    switch ((s ?? "").toLowerCase()) {
        case "completed":
        case "succeeded":
            return "paid";
        case "failed":
        case "expired":
            return "failed";
        case "cancelled":
        case "canceled":
            return "cancelled";
        case "pending":
            return "pending";
        case undefined:
        case "":
            return "unknown";
        default:
            return "pending";
    }
}

/**
 * Verifies the HMAC signature on a HitPay webhook payload.
 * The webhook body is form-urlencoded; pass the parsed key/value map.
 * Returns true if signature is valid, false otherwise.
 */
export function verifyHitPayWebhookSignature(
    body: Record<string, string>,
    providedHmac: string,
    salt: string,
): boolean {
    const fields = Object.entries(body)
        .filter(([k]) => k !== "hmac")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}${v}`)
        .join("");
    const expected = createHmac("sha256", salt).update(fields).digest("hex");
    return expected === providedHmac;
}

export class HitPayGateway implements PaymentGateway {
    name = "hitpay" as const;

    async createIntent(input: CreateIntentInput): Promise<IntentResult> {
        const apiKey = requireKey();
        const origin = siteOrigin();
        const body = new URLSearchParams();
        body.set("amount", String(input.plan.amount));
        body.set("currency", input.plan.currency);
        if (input.userEmail) body.set("email", input.userEmail);
        body.set("name", input.plan.name);
        body.set("purpose", input.plan.description);
        body.set("reference_number", `user:${input.userId}|plan:${input.plan.id}`);
        // Include planId in the redirect so the return page can finalize even
        // before the webhook arrives. HitPay appends payment_id + status + hmac
        // to this URL as query params.
        body.set("redirect_url", `${origin}/checkout/return?planId=${input.plan.id}`);
        body.set("webhook", `${origin}/api/payments/webhook/hitpay`);
        body.set("payment_methods[]", "card");
        body.append("payment_methods[]", "paynow_online");
        body.append("payment_methods[]", "grabpay");

        const res = await fetch(`${hitpayBaseUrl()}/payment-requests`, {
            method: "POST",
            headers: {
                "x-business-api-key": apiKey,
                "x-requested-with": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`HitPay createIntent failed: ${res.status} ${err}`);
        }
        const data = await res.json();
        if (!data?.id || !data?.url) {
            throw new Error(`HitPay createIntent: malformed response ${JSON.stringify(data).slice(0, 200)}`);
        }
        return {
            // HitPay's payment_request.id — opaque identifier.
            intentId: data.id as string,
            // For HitPay clientSecret IS the hosted-checkout URL. The flow
            // field below tells the checkout page to redirect to it rather
            // than treat it as an SDK token.
            clientSecret: data.url as string,
            amount: input.plan.amount,
            currency: input.plan.currency,
            gateway: "hitpay",
            flow: "redirect",
        };
    }

    async getStatus(intentId: string): Promise<PaymentStatus> {
        const apiKey = requireKey();
        const res = await fetch(`${hitpayBaseUrl()}/payment-requests/${intentId}`, {
            method: "GET",
            headers: {
                "x-business-api-key": apiKey,
                "x-requested-with": "XMLHttpRequest",
            },
        });
        if (!res.ok) {
            return { status: "unknown", rawStatus: `http ${res.status}` };
        }
        const data = await res.json();
        return {
            status: normaliseStatus(data.status),
            rawStatus: data.status,
        };
    }

    getClientConfig(): ClientConfig {
        const env = (process.env.HITPAY_ENV ?? "sandbox").toLowerCase();
        return {
            gateway: "hitpay",
            env: env === "prod" ? "prod" : "sandbox",
            extra: {
                // Signals to the checkout page that it should redirect to the
                // clientSecret URL rather than mount an in-page SDK.
                flow: "redirect",
            },
        };
    }
}
