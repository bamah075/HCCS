// POST /api/compliance/download
//
// Takes a compliance-scan submission body (same shape as /api/compliance) and
// streams back a PDF with the same visual layout as the admin panel's report.
// Used by the "Download Report" button on the results page.

import { NextRequest } from "next/server";
import {
    generateCompliancePdfBuffer,
    adaptFrontendBody,
    PdfServiceUnavailableError,
} from "@/lib/compliance/generate-pdf";
import { checkAntiAbuse } from "@/lib/anti-abuse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Lighter rate limit than the email-send route since download is server-side
    // synthesis only (no DB write, no Resend call).
    const block = await checkAntiAbuse(req, {
        action: "compliance-download",
        body,
        maxPerHour: 20,
        maxPerDay: 60,
    });
    if (block) return block;

    const { scanData, summary, answers, actionReports } = adaptFrontendBody(body);
    let buf: Buffer;
    try {
        buf = await generateCompliancePdfBuffer(scanData, summary, answers, actionReports, {
            withCustomerDetails: true,
        });
    } catch (e) {
        if (e instanceof PdfServiceUnavailableError) {
            return new Response(
                JSON.stringify({
                    error: "Report rendering service temporarily unavailable. Please contact administrator.",
                    reason: e.reason,
                }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
                },
            );
        }
        throw e;
    }

    const safe = (scanData.company_name ?? "compliance")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
    const filename = `HCCS-Compliance-Report_${safe}_${Date.now()}.pdf`;

    return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    });
}
