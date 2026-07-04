import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAntiAbuse, clientIp } from "@/lib/anti-abuse";

type CompletionPayload = {
  qr_code?: string;
  participant_id?: string;
  score?: number;
  turnstile_token?: string;
  website?: string;
};

const QR_CODE_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompletionPayload;

    // Anti-abuse: origin + honeypot + Turnstile + rate-limit
    const block = await checkAntiAbuse(request, {
      action: "mini-quiz",
      body: body as unknown as Record<string, unknown>,
      maxPerHour: 10,
      maxPerDay: 30,
    });
    if (block) return block;

    const qrCode = typeof body.qr_code === "string" ? body.qr_code.trim() : "";
    const participantId = typeof body.participant_id === "string" ? body.participant_id.trim() : "";
    const rawScore = body.score;

    if (!QR_CODE_PATTERN.test(qrCode)) {
      return NextResponse.json({ error: "Invalid qr_code." }, { status: 400 });
    }

    if (!UUID_PATTERN.test(participantId)) {
      return NextResponse.json({ error: "Invalid participant_id." }, { status: 400 });
    }

    if (
      typeof rawScore !== "number" ||
      !Number.isInteger(rawScore) ||
      rawScore < 0 ||
      rawScore > 9
    ) {
      return NextResponse.json({ error: "Invalid score." }, { status: 400 });
    }

    const score = rawScore;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server is not configured for quiz completion submission." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin.from("mini_quiz_completions").upsert(
      {
        qr_code: qrCode,
        participant_id: participantId,
        score,
      },
      {
        onConflict: "qr_code,participant_id",
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
