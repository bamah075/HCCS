import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const id = body.get("id");
    const payload = {
        customer_name: body.get("customer_name") ?? "",
        order_intent: body.get("order_intent") ?? "",
        subtotal: parseFloat(body.get("subtotal") || 0),
        tax: parseFloat(body.get("tax") || 0),
        total: parseFloat(body.get("total") || 0),
        order_paid: parseInt(body.get("order_paid") || 0),
    };

    const { data, error } = await supabase
        .from("order")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
