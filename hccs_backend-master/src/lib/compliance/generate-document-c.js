// Merges a compliance-scan submission's report ("Document A") with a
// staff-uploaded document ("Document B") into a single "Document C",
// storing all three. Called directly from the per-lead upload action —
// there's no automatic trigger; a staff member uploads Document B for one
// specific lead and gets Document C immediately.

import 'server-only';
import { mergePdfBuffers } from 'src/lib/compliance/merge-pdf';

const BUCKET = 'compliance-documents';

export async function generateDocumentC(supabase, scanId, documentABuffer, documentBBuffer, opts = {}) {
    const documentCBuffer = await mergePdfBuffers(documentABuffer, documentBBuffer);

    const timestamp = Date.now();
    const basePath = `compliance/${scanId}/${timestamp}`;
    const documentAPath = `${basePath}-document-a.pdf`;
    const documentBPath = `${basePath}-document-b.pdf`;
    const documentCPath = `${basePath}-document-c.pdf`;

    const uploads = await Promise.all([
        supabase.storage.from(BUCKET).upload(documentAPath, documentABuffer, { contentType: 'application/pdf' }),
        supabase.storage.from(BUCKET).upload(documentBPath, documentBBuffer, { contentType: 'application/pdf' }),
        supabase.storage.from(BUCKET).upload(documentCPath, documentCBuffer, { contentType: 'application/pdf' }),
    ]);
    const uploadError = uploads.find((u) => u.error);
    if (uploadError) {
        return { ok: false, message: uploadError.error.message };
    }

    const { data: createdRow, error: insertError } = await supabase
        .from('compliance_document')
        .insert({
            compliance_scan_id: scanId,
            uploaded_by: opts.uploadedBy || null,
            document_b_filename: opts.documentBFilename || 'document-b.pdf',
            document_a_path: documentAPath,
            document_b_path: documentBPath,
            document_c_path: documentCPath,
            notes: opts.notes || null,
        })
        .select('id, created_at')
        .single();

    if (insertError || !createdRow) {
        return { ok: false, message: insertError?.message || 'Failed to save document record.' };
    }

    return {
        ok: true,
        data: {
            id: createdRow.id,
            created_at: createdRow.created_at,
            document_a_path: documentAPath,
            document_b_path: documentBPath,
            document_c_path: documentCPath,
        },
    };
}
