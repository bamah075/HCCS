// Receives Content Security Policy violation reports from browsers and logs them to security_event.
// Browsers POST { "csp-report": { ... } } as application/csp-report.

import { NextRequest } from "next/server";
import { logSecurityEvent, clientIp, clientUa, checkRateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    // Cap to avoid noisy clients blowing up the log
    const limit = await checkRateLimit({ action: "csp-report", bucketKey: ip, windowSeconds: 60, max: 30 });
    if (!limit.allowed) return new Response(null, { status: 204 });

    let report: unknown = null;
    try {
        const text = await req.text();
        if (text) report = JSON.parse(text);
    } catch {
        // Some browsers send malformed reports; just discard
    }

    const r = (report as { "csp-report"?: Record<string, unknown> })?.["csp-report"] ?? (report as Record<string, unknown>) ?? {};
    logSecurityEvent({
        eventType: "csp_report",
        ip,
        userAgent: clientUa(req),
        metadata: {
            documentUri: r["document-uri"],
            violatedDirective: r["violated-directive"],
            blockedUri: r["blocked-uri"],
            disposition: r["disposition"],
            statusCode: r["status-code"],
        },
    });

    return new Response(null, { status: 204 });
}
