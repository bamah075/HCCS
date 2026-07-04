import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const payload = {
        name: body.get("name"),
        user_tier_id: Number(body.get("user_tier_id")),
        billing_cycle: body.get("billing_cycle"),
        price: parseFloat(body.get("price")),
        currency: body.get("currency") || "MYR",
        description: body.get("description"),
        is_active: body.get("is_active") !== null ? Number(body.get("is_active")) : 1,
    };

    const { data, error } = await supabase
        .from("subscription_plan")
        .insert(payload)
        .select("*, user_tier(id, name)")
        .single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
