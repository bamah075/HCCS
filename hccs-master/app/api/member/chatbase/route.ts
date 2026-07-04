import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: appUser, error: appUserError } = await admin
    .from("user")
    .select("user_tier_id")
    .eq("id", user.id)
    .single();

  if (appUserError || !appUser) {
    return NextResponse.json({ user_tier_id: 1, tier_name: "Essential", chatbase_id: null }, { status: 200 });
  }

  const { data: tierData } = await admin
    .from("user_tier")
    .select("id, name, chatbase_id")
    .eq("id", appUser.user_tier_id)
    .single();

  return NextResponse.json(
    {
      user_tier_id: tierData?.id ?? appUser.user_tier_id,
      tier_name: tierData?.name ?? "Essential",
      chatbase_id: tierData?.chatbase_id ?? null,
    },
    { status: 200 }
  );
}
