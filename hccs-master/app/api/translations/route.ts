// Thin proxy to the upstream AI Services gateway.
//
// Translation overrides are merged gateway-side from this site's Supabase
// `translation` table. The result is { en: { dotted.key: value, ... }, zh: ... }.
// If the gateway is unavailable or the subscription has lapsed, this route
// returns empty maps and the calling site falls back to its committed base
// locale (lib/i18n/index.tsx already handles that quietly).

import { NextResponse } from "next/server";

const EMPTY = { en: {}, zh: {} };

export const dynamic = "force-dynamic";

export async function GET() {
    const url = process.env.AI_GATEWAY_URL;
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
    }

    try {
        const res = await fetch(`${url.replace(/\/$/, "")}/v1/cms/translations`, {
            method: "GET",
            headers: { Authorization: `Bearer ${key}` },
            next: { revalidate: 60 },
        });
        if (!res.ok) {
            return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
        }
        const data = await res.json();
        return NextResponse.json(
            { en: data.en ?? {}, zh: data.zh ?? {} },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
        );
    } catch {
        return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
    }
}
