import { NextResponse } from "next/server";

import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError, user } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const key = body.get("key");
    const value_en = body.get("value_en");
    const value_zh = body.get("value_zh");

    if (!key || typeof key !== "string") {
        return NextResponse.json({ status: false, message: "key required" }, { status: 400 });
    }

    const payload = {
        key,
        value_en: value_en === null || value_en === undefined ? null : String(value_en),
        value_zh: value_zh === null || value_zh === undefined ? null : String(value_zh),
        updated_by: user?.id ?? null,
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("translation")
        .upsert(payload, { onConflict: "key" })
        .select()
        .single();

    if (error) return NextResponse.json({ status: false, message: error.message });
    return NextResponse.json({ status: true, data });
}
