// POST /api/aihr/tts — thin proxy to the gateway's TTS endpoint.
// Body: { text, lang?, voice? }
// Returns: audio/mpeg stream.
//
// Demo, bearer, and anonymous identities are resolved the same way as /api/aihr/chat.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "crypto";
import { validateDemoSession } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ipFromRequest(req: NextRequest): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";
}

function isUnlimitedUserId(userId: string): boolean {
    const env = process.env.AIHR_UNLIMITED_USER_IDS ?? "";
    if (!env) return false;
    return env.split(",").map((s) => s.trim()).filter(Boolean).includes(userId);
}

async function resolveIdentifier(req: NextRequest): Promise<string> {
    // 1. New demo-token path (server-validated)
    const demoToken = req.headers.get("x-aihr-demo-token");
    if (demoToken) {
        const result = await validateDemoSession(demoToken);
        if (result.valid) return `demo-${randomUUID()}`;
    }

    // 2. Legacy demo-key path (transition compat)
    const demoKey = process.env.AIHR_DEMO_KEY;
    if (demoKey && req.headers.get("x-aihr-demo-key") === demoKey) {
        return `demo-${randomUUID()}`;
    }

    // 3. Authenticated Supabase user
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let userId: string | null = null;
    if (bearer) {
        const sbAuth = createSupabase(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user } } = await sbAuth.auth.getUser(bearer);
        userId = user?.id ?? null;
    } else {
        const cookieStore = await cookies();
        const sb = createServerClient(url, anonKey, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { /* no-op */ },
            },
        });
        const { data: { user } } = await sb.auth.getUser();
        userId = user?.id ?? null;
    }
    if (userId) {
        // Rotate the end-user id for unlimited testers so they're not throttled at the gateway.
        return isUnlimitedUserId(userId) ? `unl-${randomUUID()}` : `user:${userId}`;
    }

    // 4. Anonymous: IP+UA hash
    const ua = req.headers.get("user-agent") ?? "unknown";
    return "anon:" + createHash("sha256").update(`${ipFromRequest(req)}|${ua}`).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
    const gwUrl = process.env.AI_GATEWAY_URL?.replace(/\/$/, "");
    const gwKey = process.env.AI_GATEWAY_KEY;
    if (!gwUrl || !gwKey) {
        return NextResponse.json({ error: "Gateway not configured." }, { status: 503 });
    }

    const endUserId = await resolveIdentifier(req);
    const body = await req.text();

    const gwRes = await fetch(`${gwUrl}/v1/aihr/tts`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${gwKey}`,
            "Content-Type": "application/json",
            "X-End-User-Id": endUserId,
        },
        body,
    });

    return new Response(gwRes.body, {
        status: gwRes.status,
        headers: {
            "Content-Type": gwRes.headers.get("content-type") ?? "audio/mpeg",
            "Cache-Control": "no-cache",
            "X-Via": "gateway",
        },
    });
}
