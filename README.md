# HCCS Platform

Source code for the HCCS platform — the public site at `hccs.sg` and the staff admin panel at `admin.hccs.sg`.

## Layout

```
hccs-master/                 Public marketing site (Next.js 16, TypeScript)
hccs_backend-master/         Staff admin panel (Next.js 14, MUI 5)
```

Each subdirectory has its own `README.md` describing how to run it locally, its external service dependencies, and the environment variables it expects.

## External service dependencies

See `hccs-master/README.md` for the full table. In summary the platform relies on:

- **Supabase** — Postgres + Auth + Storage
- **Resend** — transactional email
- **Airwallex** — payment checkout
- **AI Services gateway** — AIHR chat, compliance-scan scoring, compliance-report PDF rendering, translation overrides
- **Cloudflare Turnstile** — anti-abuse on public forms
- **Upstash Redis** — rate limiting

## Database

Schema migrations are kept under `hccs-master/supabase/migrations/`. Apply them in numerical order to reproduce the live database structure.
