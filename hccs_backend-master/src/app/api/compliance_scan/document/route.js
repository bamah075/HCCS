import { NextResponse } from 'next/server';
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { loadScanPayload } from 'src/lib/compliance/load-scan-payload';
import { generateCompliancePdfBuffer, PdfServiceUnavailableError } from 'src/lib/compliance/generate-report-pdf';
import { mergePdfBuffers } from 'src/lib/compliance/merge-pdf';

const BUCKET = 'compliance-documents';

async function isPdf(file) {
    const head = Buffer.from(await file.slice(0, 5).arrayBuffer());
    return head.toString('utf8') === '%PDF-';
}

export async function POST(request) {
    const { user, error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const body = await request.formData();
    const scanId = Number(body.get('scan_id'));
    const file = body.get('document_b_file');
    const notes = String(body.get('notes') || '').trim();

    if (!scanId) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }
    if (!file || typeof file === 'string') {
        return NextResponse.json({ status: false, message: 'No document was uploaded.' });
    }
    if (!(await isPdf(file))) {
        return NextResponse.json({
            status: false,
            message: 'That file isn\'t a PDF. Please export/save it as a PDF first, then upload it.',
        });
    }

    const payload = await loadScanPayload(scanId);
    if (payload.error) {
        return NextResponse.json({ status: false, message: payload.error });
    }
    const { scan, summary, answers, actionReports } = payload;

    let documentABuffer;
    try {
        documentABuffer = await generateCompliancePdfBuffer(scan, summary, answers, actionReports);
    } catch (e) {
        if (e instanceof PdfServiceUnavailableError) {
            return NextResponse.json(
                { status: false, message: `Report service unavailable (${e.reason}). Please try again shortly.` },
                { status: 503 },
            );
        }
        throw e;
    }

    const documentBBuffer = Buffer.from(await file.arrayBuffer());
    const documentCBuffer = await mergePdfBuffers(documentABuffer, documentBBuffer);

    const timestamp = Date.now();
    const basePath = `compliance/${scanId}/${timestamp}`;
    const documentAPath = `${basePath}-document-a.pdf`;
    const documentBPath = `${basePath}-document-b.pdf`;
    const documentCPath = `${basePath}-document-c.pdf`;

    const supabase = createAdminClient();
    const uploads = await Promise.all([
        supabase.storage.from(BUCKET).upload(documentAPath, documentABuffer, { contentType: 'application/pdf' }),
        supabase.storage.from(BUCKET).upload(documentBPath, documentBBuffer, { contentType: 'application/pdf' }),
        supabase.storage.from(BUCKET).upload(documentCPath, documentCBuffer, { contentType: 'application/pdf' }),
    ]);
    const uploadError = uploads.find((u) => u.error);
    if (uploadError) {
        return NextResponse.json({ status: false, message: uploadError.error.message });
    }

    const { data: createdRow, error: insertError } = await supabase
        .from('compliance_document')
        .insert({
            compliance_scan_id: scanId,
            uploaded_by: user?.id || null,
            document_b_filename: file.name || 'document-b.pdf',
            document_a_path: documentAPath,
            document_b_path: documentBPath,
            document_c_path: documentCPath,
            notes: notes || null,
        })
        .select('id, created_at')
        .single();

    if (insertError || !createdRow) {
        return NextResponse.json({ status: false, message: insertError?.message || 'Failed to save document record.' });
    }

    return NextResponse.json({
        status: true,
        data: {
            id: createdRow.id,
            created_at: createdRow.created_at,
            document_a_path: documentAPath,
            document_b_path: documentBPath,
            document_c_path: documentCPath,
        },
    });
}
