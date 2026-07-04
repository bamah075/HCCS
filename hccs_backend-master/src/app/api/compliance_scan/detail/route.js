import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

function safeParseResults(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function toArrayValue(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return [value];
        }
    }
    return [];
}

export async function POST(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const body = await request.formData();
    const id = Number(body.get("id"));

    if (!id) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }

    const supabase = createAdminClient();

    const { data: scan, error: scanError } = await supabase
        .from("compliance_scan")
        .select('*')
        .eq("id", id)
        .single();

    if (scanError || !scan) {
        return NextResponse.json({ status: false, message: scanError?.message || 'Compliance scan not found.' });
    }

    const { data: answerRows, error: answerError } = await supabase
        .from('compliance_answer')
        .select('id, answer, compliance_scan_question, compliance_question(id, title)')
        .eq('compliance_scan_id', id)
        .order('compliance_scan_question', { ascending: true });

    let normalizedAnswers = [];
    if (!answerError && Array.isArray(answerRows)) {
        normalizedAnswers = answerRows.map((row, index) => ({
            id: row.id,
            question_id: row.compliance_scan_question,
            question_number: index + 1,
            question: row.compliance_question?.title || '-',
            selected: row.answer || '-',
        }));
    }

    const { data: actionReportRows } = await supabase
        .from('compliance_action_report')
        .select('id, created_at, remarks')
        .eq('compliance_scan_id', id)
        .order('id', { ascending: false });

    const actionReportIds = Array.isArray(actionReportRows) ? actionReportRows.map((row) => row.id) : [];
    let actionRows = [];

    if (actionReportIds.length > 0) {
        const { data: actionTakenRows } = await supabase
            .from('compliance_action_taken')
            .select('id, compliance_action_report_id, compliance_question_id, action_taken')
            .in('compliance_action_report_id', actionReportIds)
            .order('compliance_action_report_id', { ascending: false })
            .order('compliance_question_id', { ascending: true });

        actionRows = Array.isArray(actionTakenRows) ? actionTakenRows : [];
    }

    const actionsByReportId = actionRows.reduce((acc, row) => {
        const reportId = row.compliance_action_report_id;
        if (!acc[reportId]) {
            acc[reportId] = [];
        }
        acc[reportId].push(row);
        return acc;
    }, {});

    const reportsWithActions = (actionReportRows || []).map((reportRow) => ({
        ...reportRow,
        actions: actionsByReportId[reportRow.id] || [],
    }));

    const latestActionReport = reportsWithActions[0] || null;

    const parsedResults = safeParseResults(scan.results);
    const fallbackAnswers = Array.isArray(parsedResults?.answers) ? parsedResults.answers : [];

    if (!normalizedAnswers.length && fallbackAnswers.length) {
        normalizedAnswers = fallbackAnswers.map((row, index) => {
            const questionNumber = row.question_number ?? index + 1;
            return {
                // For scans where no compliance_answer rows exist (e.g. submitted
                // before the schema had the table), use question_number as the
                // question_id so the UI can key Action-Taken dropdowns.
                question_id: row.question_id ?? row.compliance_scan_question ?? questionNumber,
                question_number: questionNumber,
                question: row.question || '-',
                selected: row.selected || row.answer || '-',
            };
        });
    }

    const summary = {
        totalScore: scan.total_score ?? parsedResults?.totalScore ?? '-',
        riskLevel: scan.risk_level ?? parsedResults?.riskLevel ?? '-',
        primaryRisk: scan.primary_risk ?? parsedResults?.primaryRisk ?? '-',
        alert: scan.alert || null,
        recommendation: scan.recommendation || null,
        alerts: toArrayValue(scan.alert).length ? toArrayValue(scan.alert) : toArrayValue(parsedResults?.alerts),
        recommendations: toArrayValue(scan.recommendation).length
            ? toArrayValue(scan.recommendation)
            : toArrayValue(parsedResults?.recommendations),
    };

    return NextResponse.json({
        status: true,
        data: {
            scan,
            summary,
            answers: normalizedAnswers,
            action_reports: reportsWithActions,
            action_report: latestActionReport
                ? {
                    ...latestActionReport,
                    actions: latestActionReport.actions,
                }
                : null,
        },
    });
}
