// POST /api/checkout/manual — user self-declares a PayNow / bank transfer.
//
// Creates a `manual_payment` row in `pending` status, fires an acknowledgement
// email to the user, and notifies the HCCS ops mailbox so a human can verify
// the actual bank-statement entry. Approval/rejection happens in the admin
// panel — see /api/manual_payments/approve|reject.
//
// Body: {
//   planId: number,
//   declaredEmail: string,
//   reference?: string,
//   note?: string,
// }
//
// Requires a Supabase Bearer token. The user must already exist in the
// `user` table (i.e. they registered).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPlan } from "@/lib/payments/plans";
import { PAYNOW_DETAILS } from "@/lib/payments/manual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS_EMAILS = ["enquiry@hccs.sg", "beebee@hccs.sg"];

function sgd(amount: number): string {
    return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function ackHtml(opts: {
    name: string;
    planName: string;
    descriptor: string;
    amount: number;
    reference: string;
}) {
    return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0d1f35;padding:28px 32px">
    <p style="margin:0;font-size:11px;color:#d4a84b;letter-spacing:1px;text-transform:uppercase">HCCS</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700">We received your payment declaration</h1>
  </td></tr>
  <tr><td style="padding:28px 32px 8px">
    <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
      Thank you for declaring your PayNow / bank transfer for the <strong>${opts.planName}</strong>
      (<em>${opts.descriptor}</em>, ${sgd(opts.amount)}). Our team will verify the transfer against
      our bank statement and activate your subscription, usually within one (1) business day.
    </p>
    <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
      <strong>Reference recorded:</strong> ${opts.reference || "(none)"}<br/>
      If anything looks off, just reply to this email or write to
      <a href="mailto:${PAYNOW_DETAILS.enquiryEmail}" style="color:#1a3a52">${PAYNOW_DETAILS.enquiryEmail}</a>.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;line-height:1.6">
      Automated card payments will return shortly. This manual step is temporary while we finish KYC
      with our payment processor.
    </p>
  </td></tr>
  <tr><td style="padding:24px 32px"><a href="https://hccs.sg/member-portal"
       style="display:inline-block;background:#d4a84b;color:#0d1f35;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">
       Go to your member portal</a></td></tr>
  <tr><td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
      If you did not declare this payment, please disregard this email. Your account is not affected
      until our team approves.
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function opsHtml(opts: {
    declaredEmail: string;
    planName: string;
    descriptor: string;
    amount: number;
    reference: string;
    note: string;
    userId: string;
    manualPaymentId: number;
}) {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#222;line-height:1.55">
<h2 style="margin:0 0 8px 0">New manual-payment declaration</h2>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">
  <tr><td><strong>Manual payment ID</strong></td><td>${opts.manualPaymentId}</td></tr>
  <tr><td><strong>Declared email</strong></td><td>${opts.declaredEmail}</td></tr>
  <tr><td><strong>Auth user ID</strong></td><td>${opts.userId}</td></tr>
  <tr><td><strong>Plan</strong></td><td>${opts.planName} (${opts.descriptor})</td></tr>
  <tr><td><strong>Amount</strong></td><td>${sgd(opts.amount)}</td></tr>
  <tr><td><strong>Reference</strong></td><td>${opts.reference || "(none)"}</td></tr>
  <tr><td><strong>Note</strong></td><td>${opts.note || "(none)"}</td></tr>
</table>
<p style="margin-top:16px"><a href="https://admin.hccs.sg/manual_payments">Review in the admin panel →</a></p>
<p style="font-size:12px;color:#666">This declaration is now in <code>pending</code>. Verify the actual
bank-statement entry before approving — that step grants the subscription.</p>
</body></html>`;
}

export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
        return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    let body: { planId?: unknown; declaredEmail?: unknown; reference?: unknown; note?: unknown };
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const plan = getPlan(typeof body.planId === "number" || typeof body.planId === "string" ? body.planId : null);
    if (!plan) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    const declaredEmail = typeof body.declaredEmail === "string" ? body.declaredEmail.trim() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(declaredEmail)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Anti-spam: cap one pending declaration per user per plan within 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dup } = await admin
        .from("manual_payment")
        .select("id")
        .eq("user_id", user.id)
        .eq("subscription_plan_id", plan.id)
        .eq("status", "pending")
        .gte("declared_at", since)
        .limit(1)
        .maybeSingle();
    if (dup) {
        return NextResponse.json({
            error: "We already have a pending declaration for this plan. We will reach out shortly.",
        }, { status: 409 });
    }

    const { data: row, error: insErr } = await admin
        .from("manual_payment")
        .insert({
            user_id: user.id,
            subscription_plan_id: plan.id,
            amount: plan.amount,
            currency: plan.currency,
            declared_email: declaredEmail,
            reference: reference || null,
            note: note || null,
            status: "pending",
        })
        .select("id")
        .single();
    if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Best-effort email: ack to user + notify ops. Don't fail the declaration
    // if the mailer is down.
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
        try {
            const resend = new Resend(resendKey);
            const name = user.user_metadata?.full_name as string | undefined ?? user.email?.split("@")[0] ?? "there";
            await resend.emails.send({
                from: "HCCS <mail@hccs.sg>",
                to: [declaredEmail, user.email].filter(Boolean) as string[],
                subject: "Payment declaration received — HCCS",
                html: ackHtml({
                    name,
                    planName: plan.name,
                    descriptor: plan.descriptor,
                    amount: plan.amount,
                    reference,
                }),
            });
            await resend.emails.send({
                from: "HCCS Manual Payments <mail@hccs.sg>",
                to: OPS_EMAILS,
                subject: `[Manual payment] ${plan.descriptor} · ${sgd(plan.amount)} · ${declaredEmail}`,
                html: opsHtml({
                    declaredEmail, planName: plan.name, descriptor: plan.descriptor,
                    amount: plan.amount, reference, note, userId: user.id, manualPaymentId: row.id,
                }),
            });
        } catch (e) {
            console.warn("[manual-checkout] email send failed:", (e as Error).message);
        }
    }

    return NextResponse.json({
        ok: true,
        manualPaymentId: row.id,
        nextSteps: "Pending review. We'll confirm by email within 1 business day.",
        enquiryEmail: PAYNOW_DETAILS.enquiryEmail,
    }, { status: 201 });
}
