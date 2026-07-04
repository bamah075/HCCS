import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const payload = {
        order_id: parseInt(body.get("order_id")),
        item: body.get("item") ?? "",
        quantity: body.get("quantity") ?? "1",
        price: parseFloat(body.get("price") || 0),
    };

    const { data, error } = await supabase
        .from("order_item")
        .insert(payload)
        .select()
        .single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
