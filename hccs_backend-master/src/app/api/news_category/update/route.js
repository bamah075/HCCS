import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const id = Number(body.get("id"));
    const { data, error } = await supabase.from("news_category").update({ text: body.get("text") }).eq("id", id).select().single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
