import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const id = body.get("id");
    const user_tier_id = body.get("user_tier_id");

    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("user")
        .update({ user_tier_id: user_tier_id ? Number(user_tier_id) : null })
        .eq("id", id)
        .select()
        .single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
