// AIHR chat endpoint — thin proxy to the upstream AI Services gateway.
//
// All compliance knowledge, system prompts, rate limiting, caching, and history
// live in the upstream service. This file only:
//   1. Resolves the caller's tier from Supabase auth (Bearer token or cookie session).
//   2. Validates the demo-mode key for the /privatechatbottest sandbox.
//   3. Forwards the request to ${AI_GATEWAY_URL}/v1/aihr/chat with the resolved tier.
//
// There is no local fallback. If the upstream is unreachable or the subscription is
// suspended, this endpoint returns whatever the upstream returns (5xx / 402 / 429).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createHash, randomUUID } from 'crypto';
import { validateDemoSession } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tier names mirror the gateway's. DB stores prefixed ("AIHR Strategic") but the
// gateway accepts either form via its own tierFromString().
type AIHRTier = 'Free' | 'Essential' | 'Professional' | 'Strategic';

function tierFromString(s: string | null | undefined): AIHRTier {
    if (!s) return 'Free';
    const normalized = s.replace(/^AIHR\s+/i, '').trim();
    if (normalized === 'Essential' || normalized === 'Professional' || normalized === 'Strategic') return normalized;
    return 'Free';
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Identity {
    identifier: string;
    isAuthenticated: boolean;
    tier: AIHRTier;
}

function ipFromRequest(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? 'unknown';
}

function anonIdentifier(ip: string, ua: string): string {
    const h = createHash('sha256').update(`${ip}|${ua}`).digest('hex');
    return `anon:${h.slice(0, 24)}`;
}

function isUnlimitedUserId(userId: string): boolean {
    const env = process.env.AIHR_UNLIMITED_USER_IDS ?? '';
    if (!env) return false;
    return env.split(',').map((s) => s.trim()).filter(Boolean).includes(userId);
}

/**
 * Demo-mode override:
 * 1. Preferred: server-issued short-lived token (X-AIHR-Demo-Token header) — validates via security.validateDemoSession()
 * 2. Legacy: shared X-AIHR-Demo-Key matching env var AIHR_DEMO_KEY — kept ONLY for backward compatibility during cutover; remove after demo page is updated.
 */
async function resolveDemoMode(req: NextRequest): Promise<Identity | null> {
    // 1. New token-based path
    const tokenHeader = req.headers.get('x-aihr-demo-token');
    if (tokenHeader) {
        const result = await validateDemoSession(tokenHeader);
        if (result.valid && result.tier) {
            const tier = tierFromString(result.tier);
            return { identifier: `demo:${tokenHeader.slice(-12)}`, isAuthenticated: false, tier };
        }
        return null;
    }

    // 2. Legacy shared-key path
    const demoKey = process.env.AIHR_DEMO_KEY;
    if (!demoKey) return null;
    if (req.headers.get('x-aihr-demo-key') !== demoKey) return null;
    const tier = tierFromString(req.headers.get('x-aihr-demo-tier') ?? 'Free');
    const ip = ipFromRequest(req);
    const ua = req.headers.get('user-agent') ?? 'unknown';
    const idHash = createHash('sha256').update(`${ip}|${ua}|${tier}`).digest('hex').slice(0, 24);
    return { identifier: `demo:${idHash}`, isAuthenticated: false, tier };
}

/** Look up the logged-in user's tier from public.user. Accepts Bearer token OR cookie session. */
async function resolveTierForUser(req: NextRequest): Promise<Identity> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authHeader = req.headers.get('authorization') ?? '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    let userId: string | null = null;
    if (bearer) {
        const sbAuth = createSupabase(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user } } = await sbAuth.auth.getUser(bearer);
        userId = user?.id ?? null;
    } else {
        const cookieStore = await cookies();
        const sbUser = createServerClient(url, anonKey, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { /* no-op in route handlers */ },
            },
        });
        const { data: { user } } = await sbUser.auth.getUser();
        userId = user?.id ?? null;
    }

    if (!userId) return { identifier: '', isAuthenticated: false, tier: 'Free' };

    const sbAdmin = createSupabase(url, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await sbAdmin
        .from('user')
        .select('user_tier_id, user_tier(name)')
        .eq('id', userId)
        .single();
    const tierName = (profile as { user_tier?: { name?: string } | null } | null)?.user_tier?.name;
    return { identifier: `user:${userId}`, isAuthenticated: true, tier: tierFromString(tierName) };
}

async function resolveIdentity(req: NextRequest): Promise<Identity> {
    // Demo mode wins.
    const demo = await resolveDemoMode(req);
    return demo ?? { identifier: '', isAuthenticated: false, tier: 'Free' };
}

/** Build the X-End-User-Id header. Demo + unlimited users get a fresh id per request so the gateway never throttles them. */
function endUserIdFor(identity: Identity): string {
    if (identity.identifier.startsWith('demo:')) return `demo-${randomUUID()}`;
    if (identity.identifier.startsWith('user:')) {
        const userId = identity.identifier.slice(5);
        if (isUnlimitedUserId(userId)) return `unl-${randomUUID()}`;
    }
    return identity.identifier || `anon-${randomUUID()}`;
}

function ensureGatewayConfigured(): { url: string; key: string } | NextResponse {
    const url = process.env.AI_GATEWAY_URL?.replace(/\/$/, '');
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        return NextResponse.json(
            { error: 'AI gateway is not configured on this deployment.' },
            { status: 503 },
        );
    }
    return { url, key };
}

export async function POST(req: NextRequest) {
    const cfg = ensureGatewayConfigured();
    if (cfg instanceof NextResponse) return cfg;

    let body: { messages?: ChatMessage[]; lang?: 'en' | 'zh' };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    if (incoming.length === 0 || !incoming[incoming.length - 1]?.content) {
        return NextResponse.json({ error: 'No user message.' }, { status: 400 });
    }

    const history = incoming.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user' as const,
        content: String(m.content).slice(0, 4000),
    }));

    // Demo first; then Supabase auth; then anonymous IP+UA hash.
    let identity = await resolveIdentity(req);
    if (!identity.identifier) identity = await resolveTierForUser(req);
    if (!identity.identifier) {
        const ip = ipFromRequest(req);
        const ua = req.headers.get('user-agent') ?? 'unknown';
        identity = { identifier: anonIdentifier(ip, ua), isAuthenticated: false, tier: 'Free' };
    }

    const gwRes = await fetch(`${cfg.url}/v1/aihr/chat`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cfg.key}`,
            'Content-Type': 'application/json',
            'X-End-User-Id': endUserIdFor(identity),
        },
        body: JSON.stringify({
            messages: history,
            lang: body.lang,
            tier: identity.tier,
        }),
    });

    return new Response(gwRes.body, {
        status: gwRes.status,
        headers: {
            'Content-Type': gwRes.headers.get('content-type') ?? 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Cache': gwRes.headers.get('x-cache') ?? '',
            'X-Via': 'gateway',
        },
    });
}

export async function GET(req: NextRequest) {
    const cfg = ensureGatewayConfigured();
    if (cfg instanceof NextResponse) return cfg;

    let identity = await resolveIdentity(req);
    if (!identity.identifier) identity = await resolveTierForUser(req);
    if (!identity.identifier) {
        const ip = ipFromRequest(req);
        const ua = req.headers.get('user-agent') ?? 'unknown';
        identity = { identifier: anonIdentifier(ip, ua), isAuthenticated: false, tier: 'Free' };
    }

    const gwRes = await fetch(`${cfg.url}/v1/aihr/chat?tier=${encodeURIComponent(identity.tier)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${cfg.key}`,
            'X-End-User-Id': endUserIdFor(identity),
        },
    });

    return new Response(gwRes.body, {
        status: gwRes.status,
        headers: { 'Content-Type': gwRes.headers.get('content-type') ?? 'application/json' },
    });
}
