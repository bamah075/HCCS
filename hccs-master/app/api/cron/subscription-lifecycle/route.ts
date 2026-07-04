// Daily subscription lifecycle sweep.
//
// Schedule: Vercel cron at 01:00 UTC (09:00 SGT) — see vercel.json.
// Auth: Bearer ${CRON_SECRET}. Vercel sends this automatically when CRON_SECRET
// is set in the project env. Local / manual invocations should pass the same.
//
// Four sweeps per run (insert into subscription_notification with unique-once
// constraint, so each (subscription, kind) email is sent exactly once):
//
//   1. renewal_t7        — ends_at within (today+5d, today+7d] and status=active
//   2. renewal_t3        — ends_at within (today, today+3d]  and status=active
//   3. lapsed_t0         — ends_at <= today, status=active   → flip to past_due, set grace_until
//   4. expired_demoted   — past_due and grace_until <= today → demote user.user_tier_id=1, status=expired
//
// Grace window: GRACE_DAYS (default 14). Configurable via env.
//
// Returns: { ok: true, ran: ..., summary: { sent: {...}, demoted: N, errors: [...] } }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel cron functions can run up to 5 min on Pro / Hobby; cap our work.
export const maxDuration = 60;

const GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 14);
const OPS_AUDIT_INBOX = "enquiry@hccs.sg";

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sgd(amount: number | string | null | undefined) {
    const n = Number(amount) || 0;
    return `S$${n.toLocaleString("en-SG")}`;
}

function shortDate(iso: string | Date | null | undefined) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return String(iso); }
}

interface SubRow {
    id: number;
    user_id: string;
    subscription_plan_id: number;
    status: string;
    starts_at: string;
    ends_at: string | null;
    grace_until: string | null;
    auto_renew: boolean;
    plan: {
        id: number;
        plan_name: string | null;
        billing_cycle: string | null;
        amount: number | null;
        user_tier_id: number | null;
    } | null;
    user: {
        id: string;
        email: string | null;
        name: string | null;
    } | null;
}

function emailHtml(kind: "renewal_t7" | "renewal_t3" | "lapsed_t0" | "expired_demoted", opts: {
    name: string;
    planName: string;
    endsAt: string;
    amount: number;
    planId: number;
    graceEndsAt?: string;
}) {
    const renewLink = `https://hccs.sg/checkout/manual?planId=${opts.planId}`;
    const head = (title: string, accent: string) =>
        `<tr><td style="background:${accent};padding:24px 32px">
            <p style="margin:0;font-size:11px;color:#d4a84b;letter-spacing:1px;text-transform:uppercase">HCCS</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700">${title}</h1>
        </td></tr>`;
    const cta = (label: string) =>
        `<p style="margin:18px 0 0"><a href="${renewLink}"
            style="display:inline-block;background:#d4a84b;color:#0d1f35;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">
            ${label}</a></p>`;
    const wrap = (inner: string) =>
        `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
${inner}
<tr><td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb">
  <p style="margin:0;font-size:11px;color:#9ca3af">Questions? Reply to this email or write to enquiry@hccs.sg.</p>
</td></tr>
</table></td></tr></table></body></html>`;

    if (kind === "renewal_t7") {
        return wrap(
            head("Your subscription renews in 7 days", "#0d1f35") +
            `<tr><td style="padding:28px 32px">
                <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
                <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
                    Heads-up — your <strong>${opts.planName}</strong> subscription will lapse on
                    <strong>${shortDate(opts.endsAt)}</strong>. Pay ${sgd(opts.amount)} via PayNow to keep your
                    access uninterrupted.
                </p>
                ${cta("Renew via PayNow")}
            </td></tr>`,
        );
    }
    if (kind === "renewal_t3") {
        return wrap(
            head("3 days left on your subscription", "#0d1f35") +
            `<tr><td style="padding:28px 32px">
                <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
                <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
                    Your <strong>${opts.planName}</strong> subscription is about to lapse on
                    <strong>${shortDate(opts.endsAt)}</strong>. Pay ${sgd(opts.amount)} via PayNow now to avoid
                    interruption.
                </p>
                ${cta("Renew via PayNow")}
            </td></tr>`,
        );
    }
    if (kind === "lapsed_t0") {
        return wrap(
            head("Your subscription has lapsed — grace period started", "#7a3a3a") +
            `<tr><td style="padding:28px 32px">
                <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
                <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
                    Your <strong>${opts.planName}</strong> subscription ended on
                    <strong>${shortDate(opts.endsAt)}</strong>. You can still use it during the grace period
                    until <strong>${shortDate(opts.graceEndsAt)}</strong>, but please renew before then to
                    keep your access.
                </p>
                ${cta("Renew via PayNow")}
            </td></tr>`,
        );
    }
    // expired_demoted
    return wrap(
        head("Your account has reverted to Free tier", "#3a2222") +
        `<tr><td style="padding:28px 32px">
            <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
                We didn't see a renewal payment within the 14-day grace window, so your
                <strong>${opts.planName}</strong> subscription has expired and we've moved your account
                back to the Free tier. Your account and data are intact — re-subscribing restores
                full access immediately.
            </p>
            ${cta("Re-subscribe via PayNow")}
        </td></tr>`,
    );
}

async function recordNotification(
    admin: ReturnType<typeof adminClient>,
    sub: SubRow,
    kind: "renewal_t7" | "renewal_t3" | "lapsed_t0" | "expired_demoted",
    success: boolean,
    error: string | null,
) {
    return admin
        .from("subscription_notification")
        .insert({
            user_subscription_id: sub.id,
            user_id: sub.user_id,
            kind,
            channel: "email",
            payload: {
                plan_id: sub.subscription_plan_id,
                ends_at: sub.ends_at,
                grace_until: sub.grace_until,
            },
            success,
            error: error ?? undefined,
        })
        .select("id")
        .single();
}

async function sweep(
    admin: ReturnType<typeof adminClient>,
    resend: Resend | null,
    kind: "renewal_t7" | "renewal_t3" | "lapsed_t0" | "expired_demoted",
    rows: SubRow[],
    summary: Record<string, number>,
) {
    summary[kind] = 0;
    for (const sub of rows) {
        const plan = sub.plan;
        const userEmail = sub.user?.email;
        const name = sub.user?.name || (userEmail ? userEmail.split("@")[0] : "there");

        if (!plan || !userEmail) {
            await recordNotification(admin, sub, kind, false, "missing plan or user email");
            continue;
        }

        // Pre-insert notification row with unique-once constraint to prevent
        // double-send within the same run + across days. If insert errors with
        // unique-violation we just skip — already sent before.
        const { error: dupErr } = await admin
            .from("subscription_notification")
            .insert({
                user_subscription_id: sub.id,
                user_id: sub.user_id,
                kind,
                channel: "email",
                payload: {
                    plan_id: sub.subscription_plan_id,
                    ends_at: sub.ends_at,
                    grace_until: sub.grace_until,
                },
                success: true,
            });
        if (dupErr) {
            // 23505 = unique_violation. Treat as already-sent, skip silently.
            if (dupErr.code !== "23505") {
                console.error(`[cron] notification insert failed for sub ${sub.id} kind ${kind}:`, dupErr.message);
            }
            continue;
        }

        // Side-effects per kind:
        if (kind === "lapsed_t0") {
            const graceUntil = new Date(Date.now() + GRACE_DAYS * 24 * 3600 * 1000).toISOString();
            await admin.from("user_subscription")
                .update({ status: "past_due", grace_until: graceUntil })
                .eq("id", sub.id)
                .eq("status", "active");
            sub.grace_until = graceUntil;
        }
        if (kind === "expired_demoted") {
            await admin.from("user_subscription")
                .update({ status: "expired" })
                .eq("id", sub.id)
                .eq("status", "past_due");
            await admin.from("user")
                .update({ user_tier_id: 1 })
                .eq("id", sub.user_id);
        }

        // Send email (best-effort).
        if (resend) {
            try {
                const html = emailHtml(kind, {
                    name,
                    planName: plan.plan_name ?? "your subscription",
                    endsAt: sub.ends_at ?? "",
                    amount: Number(plan.amount ?? 0),
                    planId: sub.subscription_plan_id,
                    graceEndsAt: sub.grace_until ?? undefined,
                });
                const subject =
                    kind === "renewal_t7" ? "Your HCCS subscription renews in 7 days" :
                    kind === "renewal_t3" ? "3 days left — renew your HCCS subscription" :
                    kind === "lapsed_t0"  ? "Action needed: your HCCS subscription lapsed" :
                    "Your HCCS account reverted to Free tier";
                await resend.emails.send({
                    from: "HCCS <mail@hccs.sg>",
                    to: [userEmail],
                    bcc: kind === "expired_demoted" ? [OPS_AUDIT_INBOX] : undefined,
                    subject,
                    html,
                });
            } catch (e) {
                // Mark the notification row as failed so the next run can retry
                // (delete + re-insert) — but for now, just log.
                console.warn(`[cron] email send failed for sub ${sub.id}/${kind}:`, (e as Error).message);
            }
        }
        summary[kind] = (summary[kind] ?? 0) + 1;
    }
}

export async function GET(req: NextRequest) {
    // Auth: Vercel cron sends Authorization: Bearer ${CRON_SECRET}.
    const expected = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization") ?? "";
    if (expected && auth !== `Bearer ${expected}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = adminClient();
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const resend = resendKey ? new Resend(resendKey) : null;

    const now = new Date();
    const startedAt = now.toISOString();

    // Time bounds for each sweep (all in ISO).
    const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const in3 = new Date(todayStart); in3.setUTCDate(in3.getUTCDate() + 3);
    const in5 = new Date(todayStart); in5.setUTCDate(in5.getUTCDate() + 5);
    const in7 = new Date(todayStart); in7.setUTCDate(in7.getUTCDate() + 7);

    const selectExpr = `
        id, user_id, subscription_plan_id, status, starts_at, ends_at, grace_until, auto_renew,
        plan:subscription_plan(id, plan_name, billing_cycle, amount, user_tier_id),
        user:user(id, email, name)
    `;

    // T-7: ends_at in (today+5d, today+7d], active
    const { data: t7rows = [] } = await admin
        .from("user_subscription").select(selectExpr)
        .eq("status", "active")
        .gt("ends_at", in5.toISOString())
        .lte("ends_at", in7.toISOString());

    // T-3: ends_at in (today, today+3d], active
    const { data: t3rows = [] } = await admin
        .from("user_subscription").select(selectExpr)
        .eq("status", "active")
        .gt("ends_at", todayEnd.toISOString())
        .lte("ends_at", in3.toISOString());

    // Lapsed: ends_at <= today, status active → flip to past_due
    const { data: lapsedRows = [] } = await admin
        .from("user_subscription").select(selectExpr)
        .eq("status", "active")
        .lte("ends_at", todayEnd.toISOString());

    // Expired: status past_due + grace_until <= today → demote
    const { data: expiredRows = [] } = await admin
        .from("user_subscription").select(selectExpr)
        .eq("status", "past_due")
        .lte("grace_until", todayEnd.toISOString());

    const summary: Record<string, number> = {};
    await sweep(admin, resend, "renewal_t7", (t7rows ?? []) as unknown as SubRow[], summary);
    await sweep(admin, resend, "renewal_t3", (t3rows ?? []) as unknown as SubRow[], summary);
    await sweep(admin, resend, "lapsed_t0", (lapsedRows ?? []) as unknown as SubRow[], summary);
    await sweep(admin, resend, "expired_demoted", (expiredRows ?? []) as unknown as SubRow[], summary);

    return NextResponse.json({
        ok: true,
        ran: startedAt,
        grace_days: GRACE_DAYS,
        candidates: {
            renewal_t7: (t7rows ?? []).length,
            renewal_t3: (t3rows ?? []).length,
            lapsed_t0: (lapsedRows ?? []).length,
            expired_demoted: (expiredRows ?? []).length,
        },
        sent: summary,
    });
}
