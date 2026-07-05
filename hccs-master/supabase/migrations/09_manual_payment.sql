-- Manual PayNow / bank-transfer self-declaration flow.
--
-- Temporary path used while Airwallex + HitPay KYC are pending. A user submits
-- this form after they've transferred via PayNow QR. A staff reviewer then
-- approves (which kicks the standard finalize pipeline — same DB writes as
-- automated gateways) or rejects (with optional note for the user).

CREATE TABLE IF NOT EXISTS public.manual_payment (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subscription_plan_id BIGINT NOT NULL REFERENCES public.subscription_plan(id),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SGD',
    declared_email TEXT NOT NULL,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','cancelled')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    reviewer_note TEXT,
    user_subscription_id BIGINT REFERENCES public.user_subscription(id),
    payment_transaction_id BIGINT REFERENCES public.payment_transaction(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_payment_status_declared
    ON public.manual_payment (status, declared_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_payment_user
    ON public.manual_payment (user_id);

ALTER TABLE public.manual_payment ENABLE ROW LEVEL SECURITY;
-- All access via server-side route handlers using the service-role key.
-- No anon / authenticated policies — deliberate.
