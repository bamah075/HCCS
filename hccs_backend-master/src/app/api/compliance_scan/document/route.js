import { NextResponse } from 'next/server';
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { loadScanPayload } from 'src/lib/compliance/load-scan-payload';
import { generateCompliancePdfBuffer, PdfServiceUnavailableError } from 'src/lib/compliance/generate-report-pdf';
import { generateDocumentC } from 'src/lib/compliance/generate-document-c';

async function isPdf(file) {
    const head = Buffer.from(await file.slice(0, 5).arrayBuffer());
    return head.toString('utf8') === '%PDF-';
}

// Staff uploads a document (Document B) for one specific lead; this
// regenerates their report (Document A) and immediately combines the two
// into Document C. No automatic trigger — this upload IS the trigger.
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
    const supabase = createAdminClient();

    const result = await generateDocumentC(supabase, scanId, documentABuffer, documentBBuffer, {
        uploadedBy: user?.id || null,
        documentBFilename: file.name || 'document-b.pdf',
        notes: notes || null,
    });

    if (!result.ok) {
        return NextResponse.json({ status: false, message: result.message || 'Failed to save document record.' });
    }

    return NextResponse.json({ status: true, data: result.data });
}
