import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function GET(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("news")
        .select("*, news_category(id, text)")
        .order("id", { ascending: false });

    if (data) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
