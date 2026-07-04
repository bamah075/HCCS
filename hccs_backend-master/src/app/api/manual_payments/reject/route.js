// POST /api/manual_payments/reject
// Body: { id: number, reviewerNote?: string }
//
// Marks a pending declaration as rejected and emails the user with the reason.

import { NextResponse } from "next/server";
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function rejectedEmailHtml(opts) {
    return `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#7a3a3a;padding:28px 32px">
    <p style="margin:0;font-size:11px;color:#fcd9d9;letter-spacing:1px;text-transform:uppercase">HCCS</p>
    <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700">We couldn't verify your payment</h1>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${opts.name}</strong>,</p>
    <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
      We tried to match your declaration (reference <strong>#${opts.manualPaymentId}</strong>) against
      our bank statement but couldn't find the corresponding transfer.
    </p>
    ${opts.reviewerNote ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6"><strong>Reason:</strong> ${opts.reviewerNote}</p>` : ''}
    <p style="margin:14px 0 0;font-size:14px;color:#6b7280;line-height:1.6">
      No charge was made to your account. If you've already paid and this is a mistake on our side,
      please reply with your bank reference and we'll fix it straight away.
    </p>
    <p style="margin:18px 0 0">
      <a href="mailto:enquiry@hccs.sg" style="display:inline-block;background:#d4a84b;color:#0d1f35;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">
        Contact enquiry@hccs.sg</a>
    </p>
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

    const { data: mp, error: mpErr } = await supabase
        .from('manual_payment')
        .select('id, user_id, declared_email, amount, status, subscription_plan_id, plan:subscription_plan(plan_name)')
        .eq('id', id).single();
    if (mpErr || !mp) return NextResponse.json({ status: false, message: 'Not found' }, { status: 404 });
    if (mp.status === 'rejected') {
        return NextResponse.json({ status: true, message: 'Already rejected' });
    }
    if (mp.status !== 'pending') {
        return NextResponse.json({ status: false, message: `Cannot reject from status: ${mp.status}` }, { status: 409 });
    }

    const now = new Date();
    const { data: updated, error: updErr } = await supabase
        .from('manual_payment')
        .update({
            status: 'rejected',
            reviewed_by: reviewer.id,
            reviewed_at: now.toISOString(),
            reviewer_note: reviewerNote || null,
            updated_at: now.toISOString(),
        })
        .eq('id', mp.id)
        .select().single();
    if (updErr) return NextResponse.json({ status: false, message: updErr.message }, { status: 500 });

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey && mp.declared_email) {
        try {
            const { data: u } = await supabase.from('user').select('email, name').eq('id', mp.user_id).single();
            const name = u?.name || mp.declared_email.split('@')[0];
            const resend = new Resend(resendKey);
            await resend.emails.send({
                from: 'HCCS <mail@hccs.sg>',
                to: [mp.declared_email, u?.email].filter(Boolean),
                subject: `Payment declaration not verified — HCCS`,
                html: rejectedEmailHtml({ name, manualPaymentId: mp.id, reviewerNote }),
            });
        } catch (e) {
            console.warn('[manual-payment reject] email failed:', e.message);
        }
    }

    return NextResponse.json({ status: true, data: updated });
}
