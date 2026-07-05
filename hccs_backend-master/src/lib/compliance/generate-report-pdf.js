// Thin proxy to the upstream AI Services gateway.
//
// Ported from hccs-master/lib/compliance/generate-pdf.ts (source of truth —
// keep the request/response contract in sync if the gateway changes). The
// two apps are independent Next.js projects with no shared package, so this
// is a deliberate small duplication rather than a cross-repo import.
//
// The branded PDF rendering pipeline (layout, fonts, CJK handling, scoring
// callouts) lives at `${AI_GATEWAY_URL}/v1/compliance/pdf`. On gateway
// failure or subscription lapse this throws `PdfServiceUnavailableError` —
// callers decide whether to degrade gracefully (503, etc).

import "server-only";

export class PdfServiceUnavailableError extends Error {
    constructor(message, reason = "gateway_unavailable") {
        super(message);
        this.name = "PdfServiceUnavailableError";
        this.reason = reason;
    }
}

export async function generateCompliancePdfBuffer(
    scanData,
    summary,
    answers,
    actionReports = [],
    options = { withCustomerDetails: true },
) {
    const url = process.env.AI_GATEWAY_URL;
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        throw new PdfServiceUnavailableError("AI gateway not configured", "not_configured");
    }

    let res;
    try {
        res = await fetch(`${url.replace(/\/$/, "")}/v1/compliance/pdf`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ scanData, summary, answers, actionReports, options }),
        });
    } catch (e) {
        throw new PdfServiceUnavailableError(`PDF gateway fetch failed: ${e.message}`, "fetch_failed");
    }

    if (res.status === 402) {
        const detail = await res.json().catch(() => ({}));
        throw new PdfServiceUnavailableError(
            `PDF service subscription inactive (${detail.reason ?? "unknown"})`,
            "subscription_inactive",
        );
    }
    if (!res.ok) {
        throw new PdfServiceUnavailableError(`PDF gateway error: ${res.status}`, "gateway_error");
    }

    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
}
