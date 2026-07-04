import { NextResponse } from "next/server";
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const supabase = createAdminClient();

    const payload = {
        title: body.get("title"),
        short_description: body.get("short_description"),
        link: body.get("link"),
        public: Number(body.get("public") ?? 0),
        free: Number(body.get("free") ?? 0),
        essential: Number(body.get("essential") ?? 0),
        professional: Number(body.get("professional") ?? 0),
        strategic: Number(body.get("strategic") ?? 0),
    };

    const { data, error } = await supabase.from("resources").insert(payload).select().single();

    if (!error) {
        return NextResponse.json({ status: true, data });
    } else {
        return NextResponse.json({ status: false, message: error.message });
    }
}
