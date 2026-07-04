// Airwallex implementation of PaymentGateway.
// Lifted from the original inline code in /api/checkout/route.ts so the
// gateway switch is a one-env-var change.

import "server-only";
import { randomUUID } from "crypto";
import type {
    PaymentGateway, CreateIntentInput, IntentResult, PaymentStatus, ClientConfig,
} from "./gateway";

const API_VERSION = process.env.AIRWALLEX_API_VERSION ?? "2026-02-27";

function airwallexBaseUrl(): string {
    const env = process.env.AIRWALLEX_ENV ?? "sandbox";
    return env === "prod" ? "https://api.airwallex.com" : "https://api-demo.airwallex.com";
}

async function airwallexToken(): Promise<string> {
    const clientId = process.env.AIRWALLEX_CLIENT_ID;
    const apiKey = process.env.AIRWALLEX_API_KEY;
    if (!clientId || !apiKey) {
        throw new Error("AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY env vars must be set");
    }
    const res = await fetch(`${airwallexBaseUrl()}/api/v1/authentication/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-client-id": clientId,
            "x-api-key": apiKey,
            "x-api-version": API_VERSION,
        },
    });
    if (!res.ok) throw new Error(`Airwallex auth failed: ${await res.text()}`);
    const data = await res.json();
    return data.token as string;
}

function normaliseStatus(s: string | undefined): PaymentStatus["status"] {
    switch (s) {
        case "SUCCEEDED":
        case "PAID":
            return "paid";
        case "FAILED":
        case "EXPIRED":
            return "failed";
        case "CANCELLED":
            return "cancelled";
        case undefined:
            return "unknown";
        default:
            return "pending";
    }
}

export class AirwallexGateway implements PaymentGateway {
    name = "airwallex" as const;

    async createIntent(input: CreateIntentInput): Promise<IntentResult> {
        const token = await airwallexToken();
        const res = await fetch(`${airwallexBaseUrl()}/api/v1/pa/payment_intents/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "x-api-version": API_VERSION,
            },
            body: JSON.stringify({
                request_id: randomUUID(),
                merchant_order_id: randomUUID(),
                amount: input.plan.amount,
                currency: input.plan.currency,
                descriptor: input.plan.descriptor,
                payment_method_types: ["card", "alipay", "pay_now"],
                order: {
                    products: [{
                        name: input.plan.name,
                        quantity: 1,
                        unit_price: input.plan.amount,
                        desc: input.plan.description,
                    }],
                },
                metadata: {
                    user_id: input.userId,
                    plan_id: String(input.plan.id),
                    plan_key: input.plan.key,
                    billing_cycle: input.plan.cycle,
                },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Airwallex intent create failed: ${err}`);
        }
        const intent = await res.json();
        return {
            intentId: intent.id as string,
            clientSecret: intent.client_secret as string,
            amount: input.plan.amount,
            currency: input.plan.currency,
            gateway: "airwallex",
            flow: "inpage",
        };
    }

    async getStatus(intentId: string): Promise<PaymentStatus> {
        const token = await airwallexToken();
        const res = await fetch(`${airwallexBaseUrl()}/api/v1/pa/payment_intents/${intentId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "x-api-version": API_VERSION,
            },
        });
        if (!res.ok) {
            return { status: "unknown", rawStatus: `http ${res.status}` };
        }
        const intent = await res.json();
        return {
            status: normaliseStatus(intent.status),
            rawStatus: intent.status,
        };
    }

    getClientConfig(): ClientConfig {
        const env = process.env.NEXT_PUBLIC_AIRWALLEX_ENV ?? process.env.AIRWALLEX_ENV ?? "demo";
        return {
            gateway: "airwallex",
            env: env === "prod" ? "prod" : "demo",
        };
    }
}
