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

    const { data, error } = await supabase
        .from("user_subscription")
        .select("*, subscription_plan(id, name, billing_cycle, price, currency)")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
