import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    checkRateLimit,
    logSecurityEvent,
    rateLimitedResponse,
    validatePassword,
    clientIp,
    clientUa,
    hashEmail,
} from "@/lib/security";

type RegisterPayload = { email?: string; password?: string; website?: string };

// Same generic response for both "email already registered" and "success".
// Caller-side behavior: redirect to sign-in (the user can recover their account via reset).
const GENERIC_OK_RESPONSE = { ok: true } as const;

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    const ip = clientIp(req);
    const ua = clientUa(req);

    // 1. IP rate limit — 5 registrations per IP per hour.
    const ipRate = await checkRateLimit({ action: "register-ip", bucketKey: ip, windowSeconds: 3600, max: 5 });
    if (!ipRate.allowed) {
        logSecurityEvent({ eventType: "rate_limit_hit", ip, userAgent: ua, metadata: { route: "register", scope: "ip" } });
        return rateLimitedResponse(ipRate.retryAfterSeconds, "Too many registration attempts. Please try again in an hour.");
    }

    let body: RegisterPayload;
    try {
        body = (await req.json()) as RegisterPayload;
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Honeypot: real users never fill 'website'. Silent accept so bots don't tune around it.
    if (body?.website && String(body.website).length > 0) {
        logSecurityEvent({ eventType: "rate_limit_hit", ip, userAgent: ua, metadata: { route: "register", reason: "honeypot" } });
        return NextResponse.json(GENERIC_OK_RESPONSE, { status: 200 });
    }

    if (!body?.email || !body?.password || typeof body.email !== "string" || typeof body.password !== "string") {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (body.email.length > 256) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    if (!SIMPLE_EMAIL_RE.test(body.email)) return NextResponse.json({ error: "Invalid email." }, { status: 400 });

    const policy = validatePassword(body.password, { email: body.email });
    if (!policy.ok) {
        logSecurityEvent({ eventType: "password_reject", ip, userAgent: ua, emailHash: hashEmail(body.email), metadata: { reason: policy.reason } });
        return NextResponse.json({ error: policy.reason }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const emailHash = hashEmail(body.email);

    // Create user. If email already exists, Supabase returns 422 — we hide that fact
    // and return the same shape as success, then attempt a normal sign-in below.
    // If credentials match an existing account, sign-in will succeed (legitimate re-login flow).
    // Otherwise sign-in fails silently and we return 200 OK with no session.
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
    });

    let userId: string | null = null;
    if (!authError && authData?.user) {
        userId = authData.user.id;
        logSecurityEvent({ eventType: "register", ip, userAgent: ua, emailHash, metadata: { userId } });
    } else {
        // Could be "User already registered". Don't reveal that — proceed to sign-in attempt.
        logSecurityEvent({ eventType: "register", ip, userAgent: ua, emailHash, metadata: { duplicate_or_invalid: true } });
    }

    // Attempt sign-in (works for both fresh + duplicate-with-correct-password cases)
    const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: body.email,
        password: body.password,
    });

    if (signInError || !signInData?.session) {
        // Email exists with a different password (or some other auth error). Return same OK shape.
        return NextResponse.json({ ...GENERIC_OK_RESPONSE, session: null }, { status: 200 });
    }

    return NextResponse.json(
        {
            ok: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
        },
        { status: 200 },
    );
}
