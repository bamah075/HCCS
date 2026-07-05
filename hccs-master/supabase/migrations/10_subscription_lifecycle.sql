-- Subscription lifecycle: widen status, add notification audit table.
--
-- Manual PayNow subscribers don't have auto-renewing card-on-file. They renew
-- by re-declaring each cycle. To keep them paying we run a daily cron that
-- nudges at T-7, T-3, T-0 and demotes after a 14-day grace window. Audit
-- table records exactly which emails went to whom so we never double-send.

-- Widen user_subscription.status to include 'past_due' and 'suspended'.
ALTER TABLE public.user_subscription
    DROP CONSTRAINT IF EXISTS user_subscription_status_check;
ALTER TABLE public.user_subscription
    ADD CONSTRAINT user_subscription_status_check
    CHECK (status IN ('pending','active','past_due','suspended','expired','cancelled'));

-- Add bookkeeping for the dunning lifecycle.
ALTER TABLE public.user_subscription
    ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ;
ALTER TABLE public.user_subscription
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.user_subscription
    ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_user_subscription_ends_at
    ON public.user_subscription (ends_at)
    WHERE status IN ('active', 'past_due');

-- Append-only audit of dunning emails + status transitions. The cron uses this
-- to make sure each (subscription, kind) email goes out once.
CREATE TABLE IF NOT EXISTS public.subscription_notification (
    id BIGSERIAL PRIMARY KEY,
    user_subscription_id BIGINT NOT NULL REFERENCES public.user_subscription(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN (
        'renewal_t7', 'renewal_t3', 'lapsed_t0', 'expired_demoted', 'suspended_by_admin', 'resumed_by_admin', 'extended_by_admin'
    )),
    channel TEXT NOT NULL DEFAULT 'email',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_notification_once
    ON public.subscription_notification (user_subscription_id, kind);
CREATE INDEX IF NOT EXISTS idx_subscription_notification_user
    ON public.subscription_notification (user_id, created_at DESC);

ALTER TABLE public.subscription_notification ENABLE ROW LEVEL SECURITY;
-- Server-side access only via service-role key. No anon / authenticated policies.
