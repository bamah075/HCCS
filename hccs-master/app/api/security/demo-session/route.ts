// Issues a short-lived (1-hour) demo session token for the /privatechatbottest page.
// Replaces the previous NEXT_PUBLIC_AIHR_DEMO_KEY approach, which exposed the key in the page bundle.
//
// Rate-limited per IP: 60 sessions per hour. Each session can serve unlimited
// chat messages until it expires (the gateway's per-end-user-id buckets still
// rotate, so a single session doesn't cap on the gateway side).

import { NextRequest, NextResponse } from "next/server";
import {
    issueDemoSession,
    checkRateLimit,
    rateLimitedResponse,
    logSecurityEvent,
    clientIp,
    clientUa,
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TIERS = new Set(["Free", "Essential", "Professional", "Strategic"]);

export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    const ua = clientUa(req);

    const limit = await checkRateLimit({ action: "demo-session-ip", bucketKey: ip, windowSeconds: 3600, max: 60 });
    if (!limit.allowed) {
        return rateLimitedResponse(limit.retryAfterSeconds, "Too many demo sessions. Try again later.");
    }

    let tier = "Free";
    try {
        const body = (await req.json()) as { tier?: string };
        if (body?.tier && ALLOWED_TIERS.has(body.tier)) tier = body.tier;
    } catch {
        // No body or bad JSON — default to Free
    }

    const { token, expiresAt } = await issueDemoSession({ tier, ip, userAgent: ua });
    logSecurityEvent({ eventType: "demo_session", ip, userAgent: ua, metadata: { tier } });

    return NextResponse.json({ token, tier, expires_at: expiresAt }, { status: 200 });
}
