import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkAntiAbuse, clientIp } from "@/lib/anti-abuse";

type ConsultationPayload = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  industry?: string;
  service?: string;
  message?: string;
  turnstile_token?: string;
  website?: string;          // honeypot — must be empty
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConsultationPayload;

    if (!body?.name || !body?.email || !body?.message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Anti-abuse: origin + honeypot + Turnstile + rate-limit (per IP)
    const block = await checkAntiAbuse(req, {
      action: "consultation",
      body: body as unknown as Record<string, unknown>,
      maxPerHour: 3,
      maxPerDay: 10,
    });
    if (block) return block;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server is not configured for consultation submission." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin.from("consultation").insert({
      company_name: body.company || null,
      industry: body.industry || null,
      size: null,
      service_of_interest: body.service || null,
      description: body.message || null,
      full_name: body.name || null,
      email: body.email || null,
      contact: body.phone || null,
      ip: clientIp(req),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }


    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendFrom = "mail@hccs.sg"

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Consultation Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background-color:#065f46;padding:28px 32px;">
              <p style="margin:0;font-size:12px;color:#6ee7b7;letter-spacing:1px;text-transform:uppercase;">HCCS</p>
              <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Consultation Request Received</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>${body.name}</strong>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
                Thank you for reaching out. We have received your consultation request and will be in touch shortly.
                Here is a summary of the details you submitted:
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px;">
                ${body.company ? `
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Company</td>
                  <td style="padding:12px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${body.company}</td>
                </tr>` : ""}
                ${body.industry ? `
                <tr>
                  <td style="padding:12px 16px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Industry</td>
                  <td style="padding:12px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${body.industry}</td>
                </tr>` : ""}
                ${body.service ? `
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Service of Interest</td>
                  <td style="padding:12px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${body.service}</td>
                </tr>` : ""}
                ${body.phone ? `
                <tr>
                  <td style="padding:12px 16px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Phone</td>
                  <td style="padding:12px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${body.phone}</td>
                </tr>` : ""}
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;color:#6b7280;width:40%;vertical-align:top;">Message</td>
                  <td style="padding:12px 16px;color:#111827;line-height:1.6;">${body.message}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Our team typically responds within 1–2 business days.</p>
              <a href="https://hccs.sg" style="display:inline-block;background-color:#065f46;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                Visit HCCS
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This email was sent because you submitted a consultation request on HCCS.<br/>
                If this was not you, please disregard this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await resend.emails.send({
        from: `HCCS <${resendFrom}>`,
        to: [body.email, "enquiry@hccs.sg", "beebee@hccs.sg"].filter(Boolean) as string[],
        subject: "Your Consultation Request – HCCS",
        text: `Hi ${body.name},\n\nThank you for your consultation request. We will be in touch within 1–2 business days.\n\nDetails:\nCompany: ${body.company || "—"}\nIndustry: ${body.industry || "—"}\nService: ${body.service || "—"}\nPhone: ${body.phone || "—"}\nMessage: ${body.message}\n\nHCCS Team`,
        html,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
