import { NextResponse } from 'next/server';
import { requireStaff, requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

const BUCKET = 'compliance-documents';
const SIGNED_URL_EXPIRY_SECONDS = 600;

async function isPdf(file) {
    const head = Buffer.from(await file.slice(0, 5).arrayBuffer());
    return head.toString('utf8') === '%PDF-';
}

// GET: current standard document (most recent row), staff-visible.
export async function GET() {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const supabase = createAdminClient();
    const { data: current } = await supabase
        .from('compliance_standard_document')
        .select('id, storage_path, original_filename, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!current) {
        return NextResponse.json({ status: true, data: null });
    }

    const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(current.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    return NextResponse.json({
        status: true,
        data: {
            id: current.id,
            original_filename: current.original_filename,
            created_at: current.created_at,
            url: signed?.signedUrl || null,
        },
    });
}

// POST: replace the standard document. Admin-only — this affects every
// future user's submission, so it's a higher bar than the per-submission
// staff upload feature.
export async function POST(request) {
    const { user, error: __authError } = await requireAdmin();
    if (__authError) return __authError;

    const body = await request.formData();
    const file = body.get('document_file');

    if (!file || typeof file === 'string') {
        return NextResponse.json({ status: false, message: 'No document was uploaded.' });
    }
    if (!(await isPdf(file))) {
        return NextResponse.json({
            status: false,
            message: 'That file isn\'t a PDF. Please export/save it as a PDF first, then upload it.',
        });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `compliance/_standard/${Date.now()}-${file.name || 'standard-document.pdf'}`;

    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'application/pdf' });
    if (uploadError) {
        return NextResponse.json({ status: false, message: uploadError.message });
    }

    const { data: createdRow, error: insertError } = await supabase
        .from('compliance_standard_document')
        .insert({
            storage_path: storagePath,
            original_filename: file.name || 'standard-document.pdf',
            uploaded_by: user?.id || null,
        })
        .select('id, created_at')
        .single();

    if (insertError || !createdRow) {
        return NextResponse.json({ status: false, message: insertError?.message || 'Failed to save standard document.' });
    }

    return NextResponse.json({ status: true, data: createdRow });
}
