import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { uploadHeroFile, mirrorRemoteImage } from 'src/lib/news/hero-image';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const title = body.get("title");
    if (!title) return NextResponse.json({ status: false, message: "title required" }, { status: 400 });

    // hero_image: file upload wins; else use submitted URL, mirroring external
    // hosts to Supabase so the public site can always render the image.
    let heroUrl = body.get("hero_image_url") || null;
    const heroFile = body.get("hero_image_file");
    if (heroFile && typeof heroFile !== 'string' && heroFile.size > 0) {
        try { heroUrl = await uploadHeroFile(supabase, heroFile, title); }
        catch (e) { return NextResponse.json({ status: false, message: e.message }, { status: 500 }); }
    } else if (heroUrl) {
        heroUrl = await mirrorRemoteImage(supabase, heroUrl, title);
    }

    const publishedRaw = body.get("published_at");
    const payload = {
        title: String(title),
        title_cn: body.get("title_cn") || null,
        body: body.get("body") || null,
        body_cn: body.get("body_cn") || null,
        url: body.get("url") || null,
        agency_name: body.get("agency_name") || null,
        content_type: (() => {
            const v = String(body.get("content_type") || "").trim();
            return ["FAQ", "Information", "Update", "Advisory"].includes(v) ? v : null;
        })(),
        hero_image: heroUrl || null,
        is_published: body.get("is_published") === "true",
        published_at: publishedRaw ? new Date(String(publishedRaw)).toISOString() : null,
        category_id: body.get("category_id") ? Number(body.get("category_id")) : null,
    };

    const { data, error } = await supabase.from("news").insert(payload).select().single();
    if (error) return NextResponse.json({ status: false, message: error.message });
    return NextResponse.json({ status: true, data });
}
