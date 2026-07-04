import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { uploadHeroFile, mirrorRemoteImage } from 'src/lib/news/hero-image';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();
    const id = Number(body.get("id"));
    if (!id) return NextResponse.json({ status: false, message: "id required" }, { status: 400 });

    const title = body.get("title");

    // hero_image precedence: uploaded file > submitted URL (mirrored if external).
    // If neither field is present at all, leave hero_image untouched.
    let heroUrl;
    const heroFile = body.get("hero_image_file");
    if (heroFile && typeof heroFile !== 'string' && heroFile.size > 0) {
        try { heroUrl = await uploadHeroFile(supabase, heroFile, title); }
        catch (e) { return NextResponse.json({ status: false, message: e.message }, { status: 500 }); }
    } else if (body.get("hero_image_url") !== null) {
        const u = body.get("hero_image_url");
        if (u === "") {
            heroUrl = null;
        } else {
            heroUrl = await mirrorRemoteImage(supabase, u, title);
        }
    }

    const publishedRaw = body.get("published_at");
    const payload = {
        title: title ? String(title) : undefined,
        title_cn: body.get("title_cn") ?? undefined,
        body: body.get("body") ?? undefined,
        body_cn: body.get("body_cn") ?? undefined,
        url: body.get("url") ?? undefined,
        agency_name: body.get("agency_name") ?? undefined,
        content_type: (() => {
            const raw = body.get("content_type");
            if (raw === null || raw === undefined) return undefined;
            const v = String(raw).trim();
            if (v === "") return null;
            return ["FAQ", "Information", "Update", "Advisory"].includes(v) ? v : null;
        })(),
        is_published: body.get("is_published") === "true",
        published_at: publishedRaw !== null
            ? (publishedRaw ? new Date(String(publishedRaw)).toISOString() : null)
            : undefined,
        category_id: body.get("category_id") !== null
            ? (body.get("category_id") ? Number(body.get("category_id")) : null)
            : undefined,
    };
    if (heroUrl !== undefined) payload.hero_image = heroUrl;

    // Strip undefined so we don't overwrite columns the caller didn't send.
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { data, error } = await supabase.from("news").update(payload).eq("id", id).select().single();
    if (error) return NextResponse.json({ status: false, message: error.message });
    return NextResponse.json({ status: true, data });
}
