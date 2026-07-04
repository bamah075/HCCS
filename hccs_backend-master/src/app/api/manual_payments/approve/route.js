// POST /api/manual_payments/approve
// Body: { id: number, reviewerNote?: string }
//
// Approves a pending manual_payment declaration: cancels any active subscription,
// inserts the new subscription, upgrades the user tier, logs the payment_transaction,
// and emails the user. Idempotent on (manual_payment.id, status).

import { NextResponse } from "next/server";
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const PLAN_DURATION_DAYS = { monthly: 31, annual: 366, 'one-time': null };

function sgd(amount) {
    const n = Number(amount) || 0;
    return `S$${n.toLocaleString('en-SG')}`;
}

function fmtDate(iso) {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return String(iso); }
}

function approvedEmailHtml(opts) {
    return `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0d1f35;padding:28px 32px">
    <p style="margin:0;font-size:11px;color:#d4a84b;letter-spacing:1px;text-transform:uppercase">HCCS</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700">Your subscription is active</h1>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
      We've verified your payment for the <strong>${opts.planName}</strong>
      (${opts.descriptor}, ${sgd(opts.amount)}). Your account is now upgraded.
    </p>
    <p style="margin:14px 0 0;font-size:14px;color:#6b7280">
      Reference: <strong>#${opts.manualPaymentId}</strong>${opts.endsAt ? `<br/>Next renewal due: <strong>${fmtDate(opts.endsAt)}</strong>` : ''}
    </p>
    ${opts.descriptor === 'monthly' || opts.descriptor === 'annual' ? `
    <p style="margin:14px 0 0;font-size:13px;color:#6b7280;line-height:1.6">
      <strong>Heads up:</strong> this is a ${opts.descriptor} subscription. We'll email you a reminder
      a week before it lapses so you can pay again via PayNow.
    </p>` : ''}
    <p style="margin:18px 0 0">
      <a href="https://hccs.sg/member-portal"
         style="display:inline-block;background:#d4a84b;color:#0d1f35;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">
         Go to member portal</a>
    </p>
    ${opts.reviewerNote ? `<p style="margin:18px 0 0;font-size:13px;color:#6b7280;line-height:1.5"><strong>Note from our team:</strong> ${opts.reviewerNote}</p>` : ''}
  </td></tr>
  <tr><td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af">If anything looks off, reply to this email or write to enquiry@hccs.sg.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export async function POST(req) {
    const { user: reviewer, error: authError } = await requireStaff();
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    if (!id) return NextResponse.json({ status: false, message: 'id required' }, { status: 400 });
    const reviewerNote = typeof body.reviewerNote === 'string' ? body.reviewerNote.trim().slice(0, 500) : '';

    const supabase = createAdminClient();

    // Load + lock the row (status check makes this naturally idempotent — a
    // second approve call returns the already-applied row without re-granting).
    const { data: mp, error: mpErr } = await supabase
        .from('manual_payment')
        .select(`
            id, user_id, subscription_plan_id, amount, currency, declared_email,
            status, user_subscription_id, payment_transaction_id,
            plan:subscription_plan(id, plan_name, billing_cycle, user_tier_id)
        `)
        .eq('id', id)
        .single();
    if (mpErr || !mp) return NextResponse.json({ status: false, message: 'Not found' }, { status: 404 });

    if (mp.status === 'approved') {
        return NextResponse.json({ status: true, message: 'Already approved', data: mp });
    }
    if (mp.status !== 'pending') {
        return NextResponse.json({ status: false, message: `Cannot approve from status: ${mp.status}` }, { status: 409 });
    }

    const plan = mp.plan;
    if (!plan) {
        return NextResponse.json({ status: false, message: 'Plan lookup failed' }, { status: 500 });
    }

    const cycle = plan.billing_cycle || 'monthly';
    const durationDays = PLAN_DURATION_DAYS[cycle] ?? null;
    const now = new Date();
    const startsAt = now.toISOString();
    const endsAt = durationDays
        ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // 1. Close any currently-active subscriptions
    await supabase
        .from('user_subscription')
        .update({ status: 'cancelled', ends_at: now.toISOString() })
        .eq('user_id', mp.user_id)
        .eq('status', 'active');

    // 2. Insert new subscription (skip for non-tier plans like Expert Advisory)
    let newSubId = null;
    if (plan.user_tier_id != null) {
        const { data: subRow, error: subErr } = await supabase
            .from('user_subscription')
            .insert({
                user_id: mp.user_id,
                subscription_plan_id: plan.id,
                status: 'active',
                starts_at: startsAt,
                ends_at: endsAt,
                auto_renew: cycle !== 'one-time',
                gateway_subscription_id: `manual:${mp.id}`,
            })
            .select('id')
            .single();
        if (subErr) return NextResponse.json({ status: false, message: `subscription insert: ${subErr.message}` }, { status: 500 });
        newSubId = subRow.id;
    }

    // 3. Log payment_transaction
    const { data: txRow, error: txErr } = await supabase
        .from('payment_transaction')
        .insert({
            user_id: mp.user_id,
            user_subscription_id: newSubId,
            subscription_plan_id: cycle === 'one-time' ? null : plan.id,
            gateway: 'manual',
            gateway_payment_id: `manual:${mp.id}`,
            gateway_status: 'manual_approved',
            amount: mp.amount,
            currency: mp.currency,
            status: 'paid',
            paid_at: now.toISOString(),
            raw_response: {
                manual_payment_id: mp.id,
                approved_by: reviewer.id,
                reviewer_note: reviewerNote || null,
            },
        })
        .select('id')
        .single();
    if (txErr) return NextResponse.json({ status: false, message: `transaction insert: ${txErr.message}` }, { status: 500 });

    // 4. Upgrade user tier (if applicable)
    if (plan.user_tier_id != null) {
        await supabase.from('user').update({ user_tier_id: plan.user_tier_id }).eq('id', mp.user_id);
    }

    // 5. Mark manual_payment approved
    const { data: updated, error: updErr } = await supabase
        .from('manual_payment')
        .update({
            status: 'approved',
            reviewed_by: reviewer.id,
            reviewed_at: now.toISOString(),
            reviewer_note: reviewerNote || null,
            user_subscription_id: newSubId,
            payment_transaction_id: txRow.id,
            updated_at: now.toISOString(),
        })
        .eq('id', mp.id)
        .select()
        .single();
    if (updErr) return NextResponse.json({ status: false, message: updErr.message }, { status: 500 });

    // 6. Best-effort confirmation email
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey && mp.declared_email) {
        try {
            const { data: u } = await supabase.from('user').select('email, name').eq('id', mp.user_id).single();
            const name = u?.name || mp.declared_email.split('@')[0];
            const resend = new Resend(resendKey);
            await resend.emails.send({
                from: 'HCCS <mail@hccs.sg>',
                to: [mp.declared_email, u?.email].filter(Boolean),
                subject: `Subscription active — ${plan.plan_name}`,
                html: approvedEmailHtml({
                    name,
                    planName: plan.plan_name,
                    descriptor: cycle,
                    amount: mp.amount,
                    manualPaymentId: mp.id,
                    reviewerNote,
                    endsAt,
                }),
            });
        } catch (e) {
            console.warn('[manual-payment approve] email failed:', e.message);
        }
    }

    return NextResponse.json({ status: true, data: updated });
}
