import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    checkRateLimit,
    checkAccountLockout,
    recordLoginFailure,
    clearAccountLockout,
    logSecurityEvent,
    rateLimitedResponse,
    clientIp,
    clientUa,
    hashEmail,
} from "@/lib/security";

type SignInPayload = { email?: string; password?: string };

// Same opaque message for every failure path: prevents account enumeration AND
// reveals neither password-wrong vs email-wrong nor lockout status to a probe.
const GENERIC_AUTH_ERROR = "Invalid email or password.";

export async function POST(req: Request) {
    const ip = clientIp(req);
    const ua = clientUa(req);

    // 1. IP rate limit — blocks distributed brute force from a single network.
    // 10 attempts / 5 min / IP. Most password sprays burst much faster than this.
    const ipRate = await checkRateLimit({ action: "signin-ip", bucketKey: ip, windowSeconds: 300, max: 10 });
    if (!ipRate.allowed) {
        logSecurityEvent({ eventType: "rate_limit_hit", ip, userAgent: ua, metadata: { route: "signin", scope: "ip" } });
        return rateLimitedResponse(ipRate.retryAfterSeconds, "Too many sign-in attempts from your network. Try again in a few minutes.");
    }

    let body: SignInPayload;
    try {
        body = (await req.json()) as SignInPayload;
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (!body?.email || !body?.password || typeof body.email !== "string" || typeof body.password !== "string") {
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Basic shape sanity to avoid crazy-large payloads
    if (body.email.length > 256 || body.password.length > 256) {
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const emailHash = hashEmail(body.email);

    // 2. Per-account lockout (already locked from prior failures?)
    const lockout = await checkAccountLockout(emailHash);
    if (lockout.locked) {
        logSecurityEvent({ eventType: "lockout", ip, userAgent: ua, emailHash, metadata: { phase: "blocked", secondsRemaining: lockout.secondsRemaining } });
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // 3. Per-account rate limit (slower than IP — catches focused targeting of one account)
    // 5 attempts / 5 min / email.
    const emailRate = await checkRateLimit({ action: "signin-email", bucketKey: emailHash, windowSeconds: 300, max: 5 });
    if (!emailRate.allowed) {
        logSecurityEvent({ eventType: "rate_limit_hit", ip, userAgent: ua, emailHash, metadata: { route: "signin", scope: "email" } });
        // Same generic error rather than exposing rate-limit signal
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
        email: body.email,
        password: body.password,
    });

    if (error || !data.session) {
        const lockoutNow = await recordLoginFailure(emailHash);
        logSecurityEvent({
            eventType: lockoutNow.locked ? "lockout" : "login_fail",
            ip,
            userAgent: ua,
            emailHash,
            metadata: { failCount: lockoutNow.failCount },
        });
        return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Successful auth — clear lockout counter for this account.
    await clearAccountLockout(emailHash);
    logSecurityEvent({ eventType: "login_success", ip, userAgent: ua, emailHash });

    return NextResponse.json(
        {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        },
        { status: 200 },
    );
}
