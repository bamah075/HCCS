# HCCS Platform

Source code for the HCCS platform — the public site at `hccs.sg` and the staff admin panel at `admin.hccs.sg`.

## Layout

```
hccs-master/                 Public marketing site (Next.js 16, TypeScript)
hccs_backend-master/         Staff admin panel (Next.js 14, MUI 5)
langflow/                    Langflow (git submodule, vendored from langflow-ai/langflow)
```

Each subdirectory has its own `README.md` describing how to run it locally, its external service dependencies, and the environment variables it expects.

`langflow/` is a git submodule pinned to a specific upstream commit, not part of the HCCS application code. After cloning this repo, run `git submodule update --init --recursive` to fetch it. See `langflow/README.md` for how to run it standalone.

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
