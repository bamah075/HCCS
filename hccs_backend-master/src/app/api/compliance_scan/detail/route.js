import { NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";

import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { loadScanPayload } from 'src/lib/compliance/load-scan-payload';

const SIGNED_URL_EXPIRY_SECONDS = 600;

export async function POST(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    unstable_noStore();
    const body = await request.formData();
    const id = Number(body.get("id"));

    if (!id) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }

    const payload = await loadScanPayload(id);
    if (payload.error) {
        return NextResponse.json({ status: false, message: payload.error });
    }
    const { scan, summary, answers, actionReports, actionReport } = payload;

    const supabase = createAdminClient();
    const { data: documentRows } = await supabase
        .from('compliance_document')
        .select('id, created_at, uploaded_by, document_b_filename, document_a_path, document_b_path, document_c_path, notes')
        .eq('compliance_scan_id', id)
        .order('created_at', { ascending: false });

    const documents = await Promise.all(
        (documentRows || []).map(async (row) => {
            const [a, b, c] = await Promise.all([
                supabase.storage.from('compliance-documents').createSignedUrl(row.document_a_path, SIGNED_URL_EXPIRY_SECONDS),
                supabase.storage.from('compliance-documents').createSignedUrl(row.document_b_path, SIGNED_URL_EXPIRY_SECONDS),
                supabase.storage.from('compliance-documents').createSignedUrl(row.document_c_path, SIGNED_URL_EXPIRY_SECONDS),
            ]);
            return {
                id: row.id,
                created_at: row.created_at,
                uploaded_by: row.uploaded_by,
                document_b_filename: row.document_b_filename,
                notes: row.notes,
                document_a_url: a.data?.signedUrl || null,
                document_b_url: b.data?.signedUrl || null,
                document_c_url: c.data?.signedUrl || null,
            };
        }),
    );

    return NextResponse.json({
        status: true,
        data: {
            scan,
            summary,
            answers,
            action_reports: actionReports,
            action_report: actionReport,
            documents,
        },
    });
}
