// Gateway-agnostic payment adapter.
// The active gateway is selected via env var `PAYMENT_GATEWAY` (default:
// "airwallex"). Adding HitPay is a matter of fleshing out the stub in
// `./hitpay.ts` and setting `PAYMENT_GATEWAY=hitpay`.
//
// Every gateway-specific bit of code in the app should go through this
// interface — the checkout API route, the webhook handler, and any
// status-check endpoints. The UI checkout page reads `getClientConfig()`
// to know which SDK to mount.

import "server-only";
import type { Plan } from "./plans";

export interface CreateIntentInput {
    userId: string;
    userEmail: string | null;
    plan: Plan;
    countryCode: string;
}

export type PaymentFlow = "inpage" | "redirect";

export interface IntentResult {
    /** Gateway's payment-intent identifier — opaque to caller. */
    intentId: string;
    /**
     * For in-page flows (Airwallex): client_secret token the SDK consumes.
     * For redirect flows (HitPay): the hosted-checkout URL to navigate the
     * browser to.
     */
    clientSecret: string;
    amount: number;
    currency: string;
    gateway: GatewayName;
    /** Tells the checkout page how to consume `clientSecret`. */
    flow: PaymentFlow;
}

export interface PaymentStatus {
    /** Normalised: "pending" | "paid" | "failed" | "cancelled". */
    status: "pending" | "paid" | "failed" | "cancelled" | "unknown";
    /** Native status string from the gateway, for debugging. */
    rawStatus?: string;
}

export type GatewayName = "airwallex" | "hitpay" | "manual";

export interface ClientConfig {
    gateway: GatewayName;
    env: string;
    /** Anything else the client SDK needs at init time. */
    extra?: Record<string, unknown>;
}

export interface PaymentGateway {
    name: GatewayName;
    createIntent(input: CreateIntentInput): Promise<IntentResult>;
    getStatus(intentId: string): Promise<PaymentStatus>;
    getClientConfig(): ClientConfig;
}

let cached: PaymentGateway | null = null;

export function getGateway(): PaymentGateway {
    if (cached) return cached;
    const name = (process.env.PAYMENT_GATEWAY ?? "airwallex").toLowerCase() as GatewayName;
    if (name === "hitpay") {
        const { HitPayGateway } = require("./hitpay") as typeof import("./hitpay");
        cached = new HitPayGateway();
    } else {
        const { AirwallexGateway } = require("./airwallex") as typeof import("./airwallex");
        cached = new AirwallexGateway();
    }
    return cached;
}

/** For unit / smoke tests that need to swap implementations. */
export function _setGatewayForTest(gw: PaymentGateway | null) {
    cached = gw;
}
