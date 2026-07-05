// POST /api/compliance — public compliance-scan submission.
//
// Persists the scan + answers to Supabase, generates the branded PDF via the
// upstream AI Services gateway, emails it to the submitter, and CCs the HCCS
// ops mailboxes. Anti-abuse (origin / honeypot / Turnstile / rate-limit) runs
// first so spam never reaches the DB or the mailer.

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkAntiAbuse, clientIp } from "@/lib/anti-abuse";
import {
    generateCompliancePdfBuffer,
    adaptFrontendBody,
    PdfServiceUnavailableError,
} from "@/lib/compliance/generate-pdf";
import { mergePdfBuffers } from "@/lib/compliance/merge-pdf";

const COMPLIANCE_DOCUMENTS_BUCKET = "compliance-documents";

// Combines this submission's report with whichever "standard document" the
// admin panel currently has configured (compliance_standard_document, most
// recent row = current) into "Document C", storing both for the admin
// panel's compliance_document history. Silently does nothing if no standard
// document has been set up yet. Never blocks or fails the submission.
async function generateDocumentC(supabase: SupabaseClient, scanId: number, pdfBuffer: Buffer): Promise<void> {
    const { data: standardDoc } = await supabase
        .from("compliance_standard_document")
        .select("storage_path, original_filename")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!standardDoc) return;

    const { data: standardFile, error: downloadError } = await supabase.storage
        .from(COMPLIANCE_DOCUMENTS_BUCKET)
        .download(standardDoc.storage_path);
    if (downloadError || !standardFile) {
        console.error("[compliance] failed to download standard document:", downloadError?.message);
        return;
    }
    const standardBuffer = Buffer.from(await standardFile.arrayBuffer());

    const mergedBuffer = await mergePdfBuffers(pdfBuffer, standardBuffer);

    const timestamp = Date.now();
    const basePath = `compliance/${scanId}/${timestamp}`;
    const documentAPath = `${basePath}-document-a.pdf`;
    const documentCPath = `${basePath}-document-c.pdf`;

    const [uploadA, uploadC] = await Promise.all([
        supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).upload(documentAPath, pdfBuffer, { contentType: "application/pdf" }),
        supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).upload(documentCPath, mergedBuffer, { contentType: "application/pdf" }),
    ]);
    if (uploadA.error || uploadC.error) {
        console.error("[compliance] failed to upload Document A/C:", uploadA.error?.message, uploadC.error?.message);
        return;
    }

    const { error: insertError } = await supabase.from("compliance_document").insert({
        compliance_scan_id: scanId,
        uploaded_by: null,
        document_b_filename: standardDoc.original_filename,
        document_b_path: standardDoc.storage_path,
        document_a_path: documentAPath,
        document_c_path: documentCPath,
        notes: "Auto-generated from the standard document at submission time.",
    });
    if (insertError) {
        console.error("[compliance] failed to insert compliance_document row:", insertError.message);
    }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RISK_COLORS: Record<string, string> = { LOW: "#16a34a", MEDIUM: "#d97706", HIGH: "#dc2626" };
const RISK_LABELS: Record<string, string> = { LOW: "Low Risk", MEDIUM: "Medium Risk", HIGH: "High Risk" };

interface ScanAnswer {
    question_number?: number;
    selected?: string | null;
}

interface ScanResults {
    totalScore?: number;
    riskLevel?: keyof typeof RISK_COLORS | string;
    primaryRisk?: string;
    alerts?: string[];
    recommendations?: string[];
    answers?: ScanAnswer[];
}

interface ScanBody {
    company_name?: string;
    contact_name?: string;
    business_email?: string;
    contact_number?: string;
    industry?: string;
    employess?: string | number;        // legacy spelling kept in DB
    has_foreign_workers?: boolean | number;
    qr?: string;
    results?: ScanResults;
    [k: string]: unknown;
}

function normalizeQr(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    return cleaned || null;
}

function adminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env not configured.");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function generateCompliancePDF(body: ScanBody): Promise<Buffer> {
    const { scanData, summary, answers, actionReports } = adaptFrontendBody(body as Record<string, unknown>);
    return generateCompliancePdfBuffer(scanData, summary, answers, actionReports, {
        withCustomerDetails: true,
    });
}

function buildEmailHtml(body: ScanBody): string {
    const results = body.results ?? {};
    const riskLevel = String(results.riskLevel ?? "UNKNOWN");
    const totalScore = results.totalScore ?? 0;
    const primaryRisk = results.primaryRisk ?? "N/A";
    const alerts = Array.isArray(results.alerts) ? results.alerts : [];

    const riskHex = RISK_COLORS[riskLevel] ?? "#1e293b";
    const riskLabel = RISK_LABELS[riskLevel] ?? riskLevel;

    const alertRows = alerts
        .map((a) => `<li style="padding:6px 0;font-size:13px;color:#92400e;">&#9888; ${a}</li>`)
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr>
    <td style="background:#065f46;padding:28px 32px;">
      <p style="margin:0;font-size:11px;color:#6ee7b7;letter-spacing:1px;text-transform:uppercase;">HCCS</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Your Compliance Scan Results</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px 16px;">
      <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>${body.contact_name ?? "there"}</strong>,</p>
      <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
        Thank you for completing the HCCS HR Compliance Scan. Your personalised report is attached as a PDF.
        Here is a summary of your results:
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${riskHex};border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;background:#f9fafb;border-right:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total Score</p>
            <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${totalScore}</p>
          </td>
          <td style="padding:16px 20px;background:#f9fafb;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Risk Level</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${riskHex};">${riskLabel}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:12px 20px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#6b7280;">Primary Risk Area: <strong style="color:#111827;">${primaryRisk}</strong></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  ${alertRows ? `<tr>
    <td style="padding:0 32px 20px;">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Risk Alerts</p>
        <ul style="margin:0;padding-left:18px;">${alertRows}</ul>
      </div>
    </td>
  </tr>` : ""}
  <tr>
    <td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px;">
        ${body.company_name ? `<tr style="background:#f9fafb;"><td style="padding:10px 14px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Company</td><td style="padding:10px 14px;color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb;">${body.company_name}</td></tr>` : ""}
        ${body.industry ? `<tr><td style="padding:10px 14px;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Industry</td><td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb;">${body.industry}</td></tr>` : ""}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 24px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        Your full report with a question-by-question breakdown is attached as a <strong>PDF</strong>.
        Our team may follow up with tailored recommendations based on your results.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 28px;">
      <a href="https://hccs.sg/consultation" style="display:inline-block;background:#065f46;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
        Book a Free Expert Review
      </a>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
        This report was generated by the HCCS HR Compliance Scan tool and is for guidance only — not legal advice.<br/>
        If this was not you, please disregard this email.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
    const body = (await req.json()) as ScanBody;

    const block = await checkAntiAbuse(req, {
        action: "compliance-scan",
        body,
        maxPerHour: 5,
        maxPerDay: 15,
    });
    if (block) return block;

    const results = body.results ?? {};
    const answers = Array.isArray(results.answers) ? results.answers : [];
    const alerts = Array.isArray(results.alerts) ? results.alerts : [];
    const recommendations = Array.isArray(results.recommendations) ? results.recommendations : [];

    let supabase: SupabaseClient;
    try {
        supabase = adminClient();
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    const qr = normalizeQr(body.qr);

    const baseInsertRow = {
        company_name: body.company_name ?? null,
        contact_name: body.contact_name ?? null,
        business_email: body.business_email ?? null,
        contact_number: body.contact_number ?? null,
        industry: body.industry ?? null,
        employess: body.employess ?? null,
        has_foreign_workers: body.has_foreign_workers ?? 0,
        results: JSON.stringify(results),
        total_score: Number.isFinite(results.totalScore) ? results.totalScore : null,
        primary_risk: results.primaryRisk ?? null,
        risk_level: results.riskLevel ?? null,
        alert: JSON.stringify(alerts),
        recommendation: JSON.stringify(recommendations),
        ip: clientIp(req),
    };

    const insertRow = qr ? { ...baseInsertRow, qr } : baseInsertRow;

    let { data: scanRow, error: scanError } = await supabase
        .from("compliance_scan")
        .insert(insertRow)
        .select("id")
        .single();

    // Older schemas don't have the `qr` column; retry without it on PGRST204.
    if (scanError && qr && scanError.code === "PGRST204") {
        ({ data: scanRow, error: scanError } = await supabase
            .from("compliance_scan")
            .insert(baseInsertRow)
            .select("id")
            .single());
    }

    if (scanError) {
        console.error("[compliance] scan insert error:", scanError.message);
        return NextResponse.json({ error: scanError.message }, { status: 500 });
    }

    if (answers.length > 0 && scanRow) {
        const answerRows = answers
            .filter((a) => Number.isFinite(a?.question_number))
            .map((a) => ({
                compliance_scan_question: a.question_number,
                answer: a.selected ?? null,
                compliance_scan_id: scanRow!.id,
            }));

        if (answerRows.length > 0) {
            const { error: answerError } = await supabase
                .from("compliance_answer")
                .insert(answerRows);
            if (answerError) {
                // Non-fatal: the full answer set is already persisted on
                // compliance_scan.results (JSON). The compliance_answer table
                // requires question_number to FK to compliance_question — which
                // fails for v1 30-question scans whose IDs 21–30 have no row.
                console.warn("[compliance] compliance_answer insert skipped:", answerError.message);
            }
        }
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendFrom = "mail@hccs.sg";

    // Generate the report PDF once, reused for both the customer email and
    // the admin-panel Document C auto-combine below.
    let pdfBuffer: Buffer | null = null;
    if (scanRow) {
        try {
            pdfBuffer = await generateCompliancePDF(body);
        } catch (pdfErr) {
            if (pdfErr instanceof PdfServiceUnavailableError) {
                console.warn("[compliance] PDF gateway unavailable:", pdfErr.message);
            } else {
                console.error("[compliance] PDF generation error:", pdfErr);
            }
            // Non-fatal — submission already saved; email/Document C are skipped below.
        }
    }

    if (resendApiKey && body.business_email && pdfBuffer) {
        try {
            const resend = new Resend(resendApiKey);
            const html = buildEmailHtml(body);

            await resend.emails.send({
                from: `HCCS <${resendFrom}>`,
                to: [body.business_email, "beebee@hccs.sg", "enquiry@hccs.sg"].filter(Boolean) as string[],
                subject: "Your HCCS HR Compliance Scan Report",
                text: `Hi ${body.contact_name ?? "there"},\n\nThank you for completing the HCCS HR Compliance Scan.\n\nRisk Level: ${results.riskLevel ?? "N/A"}\nTotal Score: ${results.totalScore ?? 0}\nPrimary Risk: ${results.primaryRisk ?? "N/A"}\n\nYour full report is attached as a PDF.\n\nTo book a free expert review, visit: https://hccs.sg/consultation\n\nHCCS Team`,
                html,
                attachments: [
                    { filename: "HCCS-Compliance-Report.pdf", content: pdfBuffer },
                ],
            });
        } catch (emailErr) {
            console.error("[compliance] email error:", emailErr);
            // Non-fatal — submission already saved.
        }
    }

    if (scanRow && pdfBuffer) {
        try {
            await generateDocumentC(supabase, scanRow.id, pdfBuffer);
        } catch (docErr) {
            console.error("[compliance] Document C generation error:", docErr);
            // Non-fatal — submission already saved and emailed.
        }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
