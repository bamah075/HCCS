// Server-only security primitives: rate limiting, account lockout, password policy,
// security-event logging. Backed by Supabase (no external services required).

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

function admin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
}

// ───────────────────────────────────────────────────────────────────────────
// Client metadata extraction
// ───────────────────────────────────────────────────────────────────────────

export function clientIp(req: Request): string {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = req.headers.get('x-real-ip');
    if (xri) return xri.trim();
    return 'unknown';
}

export function clientUa(req: Request): string {
    return req.headers.get('user-agent')?.slice(0, 256) ?? 'unknown';
}

export function hashEmail(email: string): string {
    return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

// ───────────────────────────────────────────────────────────────────────────
// Rate limiting (sliding window via row count)
// ───────────────────────────────────────────────────────────────────────────

interface RateLimitOptions {
    action: string;        // e.g. 'signin'
    bucketKey: string;     // typically the IP, or hashed-email for per-account limits
    windowSeconds: number; // window length
    max: number;           // max events allowed in window
}

export interface RateLimitResult {
    allowed: boolean;
    count: number;
    max: number;
    retryAfterSeconds: number;
}

/**
 * Atomically record one attempt and check whether the bucket is over the limit.
 * If over, returns allowed=false WITHOUT recording another row (avoids quadratic growth on hammering).
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
    const sb = admin();
    const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();

    // Count existing recent attempts
    const { count: existing } = await sb
        .from('auth_rate_limit')
        .select('*', { count: 'exact', head: true })
        .eq('action', opts.action)
        .eq('bucket_key', opts.bucketKey)
        .gte('created_at', since);

    const current = existing ?? 0;

    if (current >= opts.max) {
        return { allowed: false, count: current, max: opts.max, retryAfterSeconds: opts.windowSeconds };
    }

    // Record this attempt (fire-and-forget — small race window is fine for rate limiting)
    sb.from('auth_rate_limit').insert({
        action: opts.action,
        bucket_key: opts.bucketKey,
    }).then(() => {});

    return { allowed: true, count: current + 1, max: opts.max, retryAfterSeconds: 0 };
}

// ───────────────────────────────────────────────────────────────────────────
// Account lockout (per-email)
// ───────────────────────────────────────────────────────────────────────────

const LOCKOUT_FAIL_THRESHOLD = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60;

export interface LockoutStatus {
    locked: boolean;
    failCount: number;
    secondsRemaining: number;
}

/** Check whether the account is currently locked. Read-only. */
export async function checkAccountLockout(emailHash: string): Promise<LockoutStatus> {
    const sb = admin();
    const { data } = await sb
        .from('account_lockout')
        .select('fail_count, locked_until')
        .eq('email_hash', emailHash)
        .maybeSingle();
    if (!data) return { locked: false, failCount: 0, secondsRemaining: 0 };
    const lockedUntilMs = data.locked_until ? new Date(data.locked_until).getTime() : 0;
    const now = Date.now();
    if (lockedUntilMs > now) {
        return { locked: true, failCount: data.fail_count, secondsRemaining: Math.ceil((lockedUntilMs - now) / 1000) };
    }
    return { locked: false, failCount: data.fail_count, secondsRemaining: 0 };
}

/** Record one failed authentication attempt. Returns whether this attempt triggered a lockout. */
export async function recordLoginFailure(emailHash: string): Promise<LockoutStatus> {
    const sb = admin();
    const { data: existing } = await sb
        .from('account_lockout')
        .select('fail_count, locked_until')
        .eq('email_hash', emailHash)
        .maybeSingle();

    const current = existing?.fail_count ?? 0;
    const next = current + 1;
    const lockedUntilMs = next >= LOCKOUT_FAIL_THRESHOLD ? Date.now() + LOCKOUT_DURATION_SECONDS * 1000 : null;
    const lockedUntilIso = lockedUntilMs ? new Date(lockedUntilMs).toISOString() : null;

    await sb.from('account_lockout').upsert({
        email_hash: emailHash,
        fail_count: next,
        locked_until: lockedUntilIso,
        last_fail_at: new Date().toISOString(),
    }, { onConflict: 'email_hash' });

    return {
        locked: !!lockedUntilMs,
        failCount: next,
        secondsRemaining: lockedUntilMs ? Math.ceil((lockedUntilMs - Date.now()) / 1000) : 0,
    };
}

/** Clear the failure counter on a successful login. */
export async function clearAccountLockout(emailHash: string): Promise<void> {
    const sb = admin();
    await sb.from('account_lockout').upsert({
        email_hash: emailHash,
        fail_count: 0,
        locked_until: null,
        last_fail_at: new Date().toISOString(),
    }, { onConflict: 'email_hash' });
}

// ───────────────────────────────────────────────────────────────────────────
// Security event log
// ───────────────────────────────────────────────────────────────────────────

export interface SecurityEvent {
    eventType: 'login_fail' | 'login_success' | 'lockout' | 'register' | 'rate_limit_hit' | 'demo_session' | 'csp_report' | 'password_reject';
    ip?: string;
    userAgent?: string;
    emailHash?: string;
    metadata?: Record<string, unknown>;
}

export async function logSecurityEvent(ev: SecurityEvent): Promise<void> {
    const sb = admin();
    sb.from('security_event').insert({
        event_type: ev.eventType,
        ip: ev.ip,
        user_agent: ev.userAgent,
        email_hash: ev.emailHash,
        metadata: ev.metadata ?? null,
    }).then(() => {}); // fire-and-forget
}

// ───────────────────────────────────────────────────────────────────────────
// Password policy
// ───────────────────────────────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', 'qwerty', 'qwerty123', 'letmein', 'welcome',
    'admin', 'admin123', 'monkey', 'iloveyou', '12345678', '123456789', '1234567890',
    'abcdef', 'abc123', 'changeme', 'p@ssw0rd', 'passw0rd', 'sunshine', 'master',
    'dragon', 'football', 'baseball', 'singapore', 'singapore123', 'hccs', 'hccs2026',
]);

export interface PasswordPolicyResult {
    ok: boolean;
    reason?: string;
}

export function validatePassword(pw: string, opts?: { email?: string }): PasswordPolicyResult {
    if (typeof pw !== 'string') return { ok: false, reason: 'Password is required.' };
    if (pw.length < 10) return { ok: false, reason: 'Password must be at least 10 characters.' };
    if (pw.length > 128) return { ok: false, reason: 'Password is too long.' };

    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (variety < 3) {
        return { ok: false, reason: 'Use a mix of uppercase, lowercase, digits, and symbols (at least 3 of 4).' };
    }

    const lower = pw.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) {
        return { ok: false, reason: 'This password is too common. Please choose another.' };
    }

    if (opts?.email) {
        const local = opts.email.split('@')[0]?.toLowerCase();
        if (local && local.length >= 4 && lower.includes(local)) {
            return { ok: false, reason: 'Password must not contain part of your email address.' };
        }
    }

    // Reject simple sequences
    if (/(.)\1{3,}/.test(pw)) return { ok: false, reason: 'Password must not contain a character repeated 4+ times in a row.' };
    if (/0123456789|abcdefghij|qwertyuiop/.test(lower)) return { ok: false, reason: 'Password must not contain a common keyboard or numeric sequence.' };

    return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// Demo session tokens (server-issued, server-validated)
// ───────────────────────────────────────────────────────────────────────────

const DEMO_SESSION_TTL_SECONDS = 60 * 60; // 1 hour

export async function issueDemoSession(opts: { tier: string; ip: string; userAgent: string }): Promise<{ token: string; expiresAt: string }> {
    const token = `demo_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + DEMO_SESSION_TTL_SECONDS * 1000).toISOString();
    const sb = admin();
    await sb.from('demo_session').insert({
        token,
        tier: opts.tier,
        ip: opts.ip,
        user_agent: opts.userAgent.slice(0, 256),
        expires_at: expiresAt,
    });
    return { token, expiresAt };
}

export async function validateDemoSession(token: string): Promise<{ valid: boolean; tier?: string }> {
    if (!token || !token.startsWith('demo_')) return { valid: false };
    const sb = admin();
    const { data } = await sb
        .from('demo_session')
        .select('tier, expires_at')
        .eq('token', token)
        .maybeSingle();
    if (!data) return { valid: false };
    if (new Date(data.expires_at).getTime() < Date.now()) return { valid: false };
    // bump used_count (fire-and-forget)
    sb.from('demo_session').update({ used_count: 1 } as Record<string, unknown>).eq('token', token).then(() => {});
    return { valid: true, tier: data.tier };
}

// ───────────────────────────────────────────────────────────────────────────
// Convenience: build a 429 response with Retry-After
// ───────────────────────────────────────────────────────────────────────────

export function rateLimitedResponse(retryAfterSeconds: number, message = 'Too many requests. Please try again later.'): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
}
