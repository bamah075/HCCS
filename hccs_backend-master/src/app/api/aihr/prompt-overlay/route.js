// GET  /api/aihr/prompt-overlay — read current overlay text
// PUT  /api/aihr/prompt-overlay — write overlay text (body: { overlay: string })
//
// Thin proxy to the upstream AI Services gateway. The overlay is a tenant-
// customisable instruction block the AIHR chatbot follows on every reply
// (in addition to the gateway's base behaviour). Max 8,000 characters.

import { NextResponse } from "next/server";
import { requireStaff } from 'src/lib/auth/require-role';

export const dynamic = 'force-dynamic';

function gatewayUrl(path) {
    const base = (process.env.AI_GATEWAY_URL || '').replace(/\/$/, '');
    if (!base) return null;
    return `${base}${path}`;
}

export async function GET() {
    const { error } = await requireStaff();
    if (error) return error;

    const url = gatewayUrl('/v1/cms/system-prompt');
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        return NextResponse.json({ status: false, message: 'AI services not configured.' }, { status: 503 });
    }

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
            cache: 'no-store',
        });
        if (res.status === 402) {
            return NextResponse.json(
                { status: false, message: 'AIHR subscription is not currently active.', reason: 'subscription_inactive' },
                { status: 402 },
            );
        }
        if (!res.ok) {
            return NextResponse.json({ status: false, message: `Gateway error: ${res.status}` }, { status: 502 });
        }
        const data = await res.json();
        return NextResponse.json({
            status: true,
            overlay: data.overlay ?? '',
            updatedAt: data.updatedAt ?? null,
            maxBytes: data.maxBytes ?? 8192,
        });
    } catch (e) {
        return NextResponse.json({ status: false, message: e.message }, { status: 502 });
    }
}

export async function PUT(req) {
    const { error } = await requireStaff();
    if (error) return error;

    let body;
    try { body = await req.json(); } catch {
        return NextResponse.json({ status: false, message: 'Invalid JSON' }, { status: 400 });
    }
    if (typeof body.overlay !== 'string') {
        return NextResponse.json({ status: false, message: 'overlay must be a string' }, { status: 400 });
    }

    const url = gatewayUrl('/v1/cms/system-prompt');
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        return NextResponse.json({ status: false, message: 'AI services not configured.' }, { status: 503 });
    }

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ overlay: body.overlay }),
        });
        if (res.status === 402) {
            return NextResponse.json(
                { status: false, message: 'AIHR subscription is not currently active.', reason: 'subscription_inactive' },
                { status: 402 },
            );
        }
        if (res.status === 413) {
            const detail = await res.json().catch(() => ({}));
            return NextResponse.json(
                { status: false, message: detail.error || 'Custom instructions are too long.' },
                { status: 413 },
            );
        }
        if (!res.ok) {
            const detail = await res.json().catch(() => ({}));
            return NextResponse.json(
                { status: false, message: detail.error || `Gateway error: ${res.status}` },
                { status: 502 },
            );
        }
        const data = await res.json();
        return NextResponse.json({
            status: true,
            overlay: data.overlay ?? '',
            bytes: data.bytes ?? 0,
            maxBytes: data.maxBytes ?? 8192,
        });
    } catch (e) {
        return NextResponse.json({ status: false, message: e.message }, { status: 502 });
    }
}
