import { NextResponse } from 'next/server';
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const body = await request.formData();
    const scanId = Number(body.get('scan_id'));
    const rawActions = body.get('actions');
    const remarks = String(body.get('remarks') || '').trim();

    if (!scanId) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }

    let actions = [];
    try {
        const parsed = JSON.parse(rawActions || '[]');
        actions = Array.isArray(parsed) ? parsed : [];
    } catch {
        return NextResponse.json({ status: false, message: 'Invalid actions payload.' });
    }

    const rowsToInsert = actions
        .map((item) => ({
            compliance_question_id: Number(item?.compliance_question_id),
            action_taken: String(item?.action_taken || '').trim(),
        }))
        .filter((item) => item.compliance_question_id && item.action_taken);

    const supabase = createAdminClient();

    const { data: createdReport, error: createReportError } = await supabase
        .from('compliance_action_report')
        .insert({ compliance_scan_id: scanId, remarks })
        .select('id')
        .single();

    if (createReportError || !createdReport) {
        return NextResponse.json({ status: false, message: createReportError?.message || 'Failed to create action report.' });
    }

    const reportId = createdReport.id;

    if (!rowsToInsert.length) {
        return NextResponse.json({ status: true, data: { report_id: reportId, action_count: 0, remarks } });
    }

    const payload = rowsToInsert.map((item) => ({
        compliance_action_report_id: reportId,
        compliance_question_id: item.compliance_question_id,
        action_taken: item.action_taken,
    }));

    const { data: insertedRows, error: insertError } = await supabase
        .from('compliance_action_taken')
        .insert(payload)
        .select('id, compliance_question_id, action_taken');

    if (insertError) {
        return NextResponse.json({ status: false, message: insertError.message });
    }

    return NextResponse.json({
        status: true,
        data: {
            report_id: reportId,
            action_count: insertedRows?.length || 0,
            remarks,
            actions: insertedRows || [],
        },
    });
}
