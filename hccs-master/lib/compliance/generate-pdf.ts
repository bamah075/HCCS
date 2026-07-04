// Thin proxy to the upstream AI Services gateway.
//
// The branded PDF rendering pipeline (layout, fonts, CJK handling, scoring
// callouts) lives at `${AI_GATEWAY_URL}/v1/compliance/pdf`. This module keeps
// the historic export surface (`generateCompliancePdfBuffer`, `adaptFrontendBody`,
// and the related types) so the two callers — /api/compliance/route.js and
// /api/compliance/download/route.ts — keep working without modification.
//
// On gateway failure or subscription lapse the proxy throws
// `PdfServiceUnavailableError`. Callers decide whether to degrade gracefully
// (omit the attachment, return a 503, etc.).

import "server-only";

export interface ScanData {
    company_name?: string | null;
    contact_name?: string | null;
    business_email?: string | null;
    contact_number?: string | null;
    industry?: string | null;
    employees?: string | number | null;
    employess?: string | number | null;
    has_foreign_workers?: boolean | number | null;
    created_at?: string | Date | null;
}

export interface ScanSummary {
    totalScore?: number | null;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH" | string | null;
    primaryRisk?: string | null;
    alerts?: string[] | string | null;
    recommendations?: string[] | string | null;
}

export interface ScanAnswer {
    question_number?: number | string;
    question?: string;
    selected?: string;
    question_id?: number | string;
}

export interface ActionReport {
    id?: number | string;
    created_at?: string | Date;
    remarks?: string;
    actions?: { compliance_question_id?: number | string; action_taken?: string }[];
}

export interface GenerateOptions {
    withCustomerDetails?: boolean;
}

export class PdfServiceUnavailableError extends Error {
    readonly reason: string;
    constructor(message: string, reason = "gateway_unavailable") {
        super(message);
        this.name = "PdfServiceUnavailableError";
        this.reason = reason;
    }
}

export async function generateCompliancePdfBuffer(
    scanData: ScanData,
    summary: ScanSummary,
    answers: ScanAnswer[],
    actionReports: ActionReport[] = [],
    options: GenerateOptions = { withCustomerDetails: true },
): Promise<Buffer> {
    const url = process.env.AI_GATEWAY_URL;
    const key = process.env.AI_GATEWAY_KEY;
    if (!url || !key) {
        throw new PdfServiceUnavailableError("AI gateway not configured", "not_configured");
    }

    let res: Response;
    try {
        res = await fetch(`${url.replace(/\/$/, "")}/v1/compliance/pdf`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ scanData, summary, answers, actionReports, options }),
        });
    } catch (e) {
        throw new PdfServiceUnavailableError(`PDF gateway fetch failed: ${(e as Error).message}`, "fetch_failed");
    }

    if (res.status === 402) {
        const detail = await res.json().catch(() => ({}));
        throw new PdfServiceUnavailableError(
            `PDF service subscription inactive (${detail.reason ?? "unknown"})`,
            "subscription_inactive",
        );
    }
    if (!res.ok) {
        throw new PdfServiceUnavailableError(`PDF gateway error: ${res.status}`, "gateway_error");
    }

    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
}

/**
 * Adapt the frontend scan-submission payload into the (scanData, summary,
 * answers, actionReports) shape expected by `generateCompliancePdfBuffer`.
 * Public submissions never have action reports.
 */
export function adaptFrontendBody(body: Record<string, unknown>): {
    scanData: ScanData;
    summary: ScanSummary;
    answers: ScanAnswer[];
    actionReports: ActionReport[];
} {
    const results = (body.results || {}) as Record<string, unknown>;
    const scanData: ScanData = {
        company_name: (body.company_name as string) ?? null,
        contact_name: (body.contact_name as string) ?? null,
        business_email: (body.business_email as string) ?? null,
        contact_number: (body.contact_number as string) ?? null,
        industry: (body.industry as string) ?? null,
        employess: (body.employess as string | number) ?? null,
        has_foreign_workers: (body.has_foreign_workers as boolean | number) ?? null,
        created_at: new Date().toISOString(),
    };
    const summary: ScanSummary = {
        totalScore: (results.totalScore as number) ?? null,
        riskLevel: (results.riskLevel as string) ?? null,
        primaryRisk: (results.primaryRisk as string) ?? null,
        alerts: (results.alerts as string[]) ?? [],
        recommendations: (results.recommendations as string[]) ?? [],
    };
    const rawAnswers = (results.answers as Record<string, unknown>[]) ?? [];
    const answers: ScanAnswer[] = rawAnswers.map((a) => ({
        question_number: a.question_number as number,
        question: a.question as string,
        selected: a.selected as string,
        question_id: a.question_id as number | undefined,
    }));
    return { scanData, summary, answers, actionReports: [] };
}
