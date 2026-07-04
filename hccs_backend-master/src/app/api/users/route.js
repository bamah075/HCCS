import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function GET() {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const supabase = createAdminClient();

    // Fetch all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authError) return NextResponse.json({ status: false, message: authError.message });

    // Fetch all public.user rows joined with user_tier
    const { data: publicUsers } = await supabase
        .from("user")
        .select("id, user_tier_id, user_tier(id, name)");

    const publicMap = {};
    (publicUsers ?? []).forEach((u) => { publicMap[u.id] = u; });

    const users = authData.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_tier_id: publicMap[u.id]?.user_tier_id ?? null,
        user_tier: publicMap[u.id]?.user_tier ?? null,
    }));

    return NextResponse.json({ status: true, data: users });
}
