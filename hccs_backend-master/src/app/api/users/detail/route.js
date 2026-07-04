import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const body = await request.formData();
    const id = body.get("id");

    const supabase = createAdminClient();

    // Auth user (email, created_at, etc.)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id);
    if (authError) return NextResponse.json({ status: false, message: authError.message });

    // Public user row joined with tier
    const { data: publicUser } = await supabase
        .from("user")
        .select("id, user_tier_id, user_tier(id, name)")
        .eq("id", id)
        .single();

    const merged = {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at,
        user_tier_id: publicUser?.user_tier_id ?? null,
        user_tier: publicUser?.user_tier ?? null,
    };

    return NextResponse.json({ status: true, data: merged });
}
