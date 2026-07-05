-- Staff-uploaded supplementary compliance review ("Document B") plus the
-- system-generated artifacts derived from it, per compliance_scan submission.
--
-- Admin-panel-only feature (hccs_backend-master) — the public site never
-- reads this table. Each staff upload creates a new immutable row (never
-- updated), mirroring the compliance_action_report snapshot pattern.

CREATE TABLE IF NOT EXISTS public.compliance_document (
    id BIGSERIAL PRIMARY KEY,
    compliance_scan_id BIGINT NOT NULL REFERENCES public.compliance_scan(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    document_b_filename TEXT NOT NULL,
    document_b_path TEXT NOT NULL,
    document_a_path TEXT NOT NULL,
    document_c_path TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_document_scan
    ON public.compliance_document (compliance_scan_id, created_at DESC);

ALTER TABLE public.compliance_document ENABLE ROW LEVEL SECURITY;
-- No policies added — service-role only, same as compliance_action_report /
-- compliance_action_taken. All access goes through hccs_backend-master
-- route handlers using createAdminClient().

-- Private bucket for the three PDFs (confidential HR/legal content — never
-- the public "images" bucket used for news hero images).
INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-documents', 'compliance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- The admin-managed "standard document" (e.g. a bespoke MOM/KET compliance
-- review) that gets automatically combined with EVERY new compliance_scan
-- submission's report going forward. Snapshot pattern: replacing the
-- standard document means inserting a new row — the "current" one is
-- always just the most recent row by created_at. Nothing is ever updated
-- or deleted, so past submissions' provenance (which version they were
-- combined with) stays traceable via compliance_document.document_b_path.
CREATE TABLE IF NOT EXISTS public.compliance_standard_document (
    id BIGSERIAL PRIMARY KEY,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.compliance_standard_document ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same as the other compliance_* tables.
