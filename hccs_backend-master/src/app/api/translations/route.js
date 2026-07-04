import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function GET() {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("translation")
        .select("key, value_en, value_zh, updated_at")
        .order("key", { ascending: true });

    if (error) return NextResponse.json({ status: false, message: error.message });
    return NextResponse.json({ status: true, data });
}
