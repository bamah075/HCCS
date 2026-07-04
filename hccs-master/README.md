## HCCS — public site

Next.js 16 / React 19 application serving hccs.sg.

## External service dependencies

This application relies on the following external services. Each is configured
through environment variables; if any required key is missing or revoked the
relevant feature degrades gracefully but the surrounding site continues to
operate.

| Service | Env vars | Surface it powers |
|---|---|---|
| Supabase (this site's project) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth, database, file storage |
| Resend | `RESEND_API_KEY` | Outbound transactional email |
| Airwallex | `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`, `AIRWALLEX_ENV` | Membership checkout |
| **AI Services gateway** | `AI_GATEWAY_URL`, `AI_GATEWAY_KEY` | AIHR chatbot, compliance-scan scoring, compliance-report PDF rendering, translation/CMS overrides |
| Cloudflare Turnstile | `TURNSTILE_SECRET_KEY` (frontend reads `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) | Anti-abuse on public forms |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |

### About the AI Services gateway

The intelligent features in this app — the AIHR conversational agent, the
compliance scan's scoring algorithm and PDF rendering, and the per-tenant
translation/CMS override layer — are provided by an external SaaS gateway
under separate subscription. The gateway exposes a small REST surface
authenticated via Bearer token. The features that depend on it are:

| Local code path | Gateway endpoint |
|---|---|
| `app/api/aihr/chat/route.ts` | `POST /v1/aihr/chat` |
| `app/api/aihr/usage/route.ts` | `GET  /v1/aihr/usage` |
| `app/api/compliance/route.js` (scoring + PDF) | `POST /v1/compliance/score` + `POST /v1/compliance/pdf` |
| `app/api/compliance/download/route.ts` (download) | `POST /v1/compliance/pdf` |
| `app/api/translations/route.ts` (i18n overrides) | `GET  /v1/cms/translations` |

If the gateway is unreachable or the subscription is inactive (HTTP 402), the
affected routes degrade quietly: chat shows a "temporarily unavailable" message,
the compliance form persists the submission but skips the PDF attachment, and
the public site falls back to its committed base locale.

To obtain `AI_GATEWAY_URL` / `AI_GATEWAY_KEY`, contact the administrator of the
gateway subscription. There is no in-source-tree fallback for these services.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Populate `.env.local` with the variables in the table above. Never commit
`.env*` files.

## Deployment

Production environment variables are configured per-environment in Vercel
(Project → Settings → Environment Variables). Pre-deployment checks: run
`npm run build` locally and confirm a clean build before pushing.
