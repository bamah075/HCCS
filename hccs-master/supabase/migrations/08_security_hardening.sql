-- Security hardening tables: rate limiting + account lockout + security event log.
-- All tables are server-only (RLS denies all anon/authenticated access; service role bypasses).

-- ───────── auth_rate_limit ─────────
-- Sliding-window rate limiting keyed by (action, bucket_key).
-- bucket_key is typically an IP address or sha256(email).
create table if not exists public.auth_rate_limit (
    id         bigserial primary key,
    action     text not null,            -- e.g. 'signin', 'register', 'compliance-scan'
    bucket_key text not null,            -- IP, hashed email, or hashed identifier
    created_at timestamptz not null default now()
);

create index if not exists auth_rate_limit_lookup_idx
    on public.auth_rate_limit (action, bucket_key, created_at desc);

alter table public.auth_rate_limit enable row level security;
-- No policies = service role only (the route handlers use service role).

-- ───────── account_lockout ─────────
-- After N consecutive failed signins for an email_hash, lock for `locked_until`.
create table if not exists public.account_lockout (
    email_hash    text primary key,
    fail_count    integer not null default 0,
    locked_until  timestamptz,
    last_fail_at  timestamptz not null default now()
);

alter table public.account_lockout enable row level security;

-- ───────── security_event ─────────
-- Append-only log of security-relevant events for monitoring + forensics.
create table if not exists public.security_event (
    id          bigserial primary key,
    event_type  text not null,           -- 'login_fail', 'login_success', 'lockout', 'register', 'rate_limit_hit', 'demo_session', 'csp_report'
    ip          text,
    user_agent  text,
    email_hash  text,                    -- never log raw emails
    metadata    jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists security_event_type_time_idx
    on public.security_event (event_type, created_at desc);
create index if not exists security_event_ip_idx
    on public.security_event (ip, created_at desc);

alter table public.security_event enable row level security;

-- ───────── demo_session ─────────
-- Server-issued short-lived tokens for the /privatechatbottest demo.
-- Replaces the public NEXT_PUBLIC_AIHR_DEMO_KEY pattern.
create table if not exists public.demo_session (
    token        text primary key,
    tier         text not null,
    ip           text,
    user_agent   text,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz not null,
    used_count   integer not null default 0
);

create index if not exists demo_session_expires_idx
    on public.demo_session (expires_at);

alter table public.demo_session enable row level security;

-- ───────── Cleanup function (call from cron or on each request) ─────────
create or replace function public.purge_expired_security_rows() returns void
language sql security definer as $$
    delete from public.auth_rate_limit where created_at < now() - interval '7 days';
    delete from public.demo_session     where expires_at < now() - interval '1 hour';
    delete from public.security_event   where created_at < now() - interval '90 days';
    delete from public.account_lockout  where locked_until is not null and locked_until < now() - interval '7 days' and fail_count = 0;
$$;
