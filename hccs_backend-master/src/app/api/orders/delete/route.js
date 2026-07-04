import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const id = body.get("id");

    // Delete all order items first
    await supabase.from("order_item").delete().eq("order_id", id);

    const { error } = await supabase.from("order").delete().eq("id", id);

    if (!error) {
        return NextResponse.json({ status: true });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
