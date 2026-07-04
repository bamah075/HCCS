// Anti-abuse checks for public form endpoints.
//
// Usage in a Route Handler:
//   const block = await checkAntiAbuse(req, { action: 'consultation' });
//   if (block) return block;  // returns a NextResponse with appropriate status
//
// Active checks (each opt-in via env var):
//   - Origin allowlist                              (always on if NEXT_PUBLIC_SITE_URL set)
//   - Cloudflare Turnstile token verification       (active when TURNSTILE_SECRET_KEY set)
//   - Upstash Redis rate limit                      (active when UPSTASH_REDIS_REST_URL+TOKEN set)
//   - Honeypot field check                          (always on, expects body.website to be empty)
//
// Local dev: if env vars are unset, checks become no-ops and a warning is logged.
// Production: set the env vars in Vercel; absence is a misconfiguration.

import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// Allowlist: env var primary, plus production hostnames and any *.vercel.app preview.
function isAllowedOrigin(origin: string): boolean {
  if (SITE_URL && origin === SITE_URL) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    // Apex + www
    if (host === 'hccs.sg' || host === 'www.hccs.sg') return true;
    // Any Vercel preview / production URL under this project
    if (host.endsWith('.vercel.app')) return true;
    // Local dev
    if (host === 'localhost' || host === '127.0.0.1') return true;
  } catch {}
  return false;
}
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type AntiAbuseOptions = {
  action: string;                // unique key for rate-limit bucket, e.g. 'consultation'
  body?: Record<string, unknown>; // request body, for honeypot check
  token?: string;                 // Turnstile token; if not provided, body.turnstile_token is used
  maxPerHour?: number;            // rate limit; default 5
  maxPerDay?: number;             // optional daily cap
};

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

async function checkOrigin(req: Request): Promise<NextResponse | null> {
  const origin = req.headers.get('origin');
  // Same-origin form posts (older browsers) and server-to-server requests have no Origin.
  if (!origin) return null;
  if (!isAllowedOrigin(origin)) {
    console.warn('[anti-abuse] Forbidden origin:', origin);
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }
  return null;
}

function checkHoneypot(body: Record<string, unknown> | undefined): NextResponse | null {
  if (!body) return null;
  const hp = body.website ?? body.url ?? body.homepage;
  if (hp && String(hp).length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 }); // silent accept; don't tip off the bot
  }
  return null;
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<NextResponse | null> {
  if (!TURNSTILE_SECRET) {
    console.warn('[anti-abuse] TURNSTILE_SECRET_KEY not set — skipping captcha verification');
    return null;
  }
  if (!token) {
    return NextResponse.json({ error: 'Captcha required' }, { status: 400 });
  }
  const form = new URLSearchParams();
  form.append('secret', TURNSTILE_SECRET);
  form.append('response', token);
  if (ip !== 'unknown') form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const data = (await res.json()) as { success?: boolean };
  if (!data?.success) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 });
  }
  return null;
}

async function rateLimit(
  ip: string,
  action: string,
  windowSeconds: number,
  max: number
): Promise<NextResponse | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn(`[anti-abuse] Upstash not configured — skipping rate limit (${action})`);
    return null;
  }
  // Sliding-window counter using INCR + EXPIRE.
  const key = `ratelimit:${action}:${ip}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  try {
    // INCR
    const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const { result: count } = (await incrRes.json()) as { result: number };
    if (count === 1) {
      // First hit — set TTL
      await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
    }
    if (count > max) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(windowSeconds) } }
      );
    }
  } catch (e) {
    console.error('[anti-abuse] rate-limit check failed; allowing through', e);
  }
  return null;
}

export async function checkAntiAbuse(
  req: Request,
  opts: AntiAbuseOptions
): Promise<NextResponse | null> {
  const ip = getClientIp(req);

  // 1. Origin
  const originBlock = await checkOrigin(req);
  if (originBlock) return originBlock;

  // 2. Honeypot (silent)
  const honeypotBlock = checkHoneypot(opts.body);
  if (honeypotBlock) return honeypotBlock;

  // 3. Turnstile
  const token = opts.token ?? (opts.body?.turnstile_token as string | undefined);
  const captchaBlock = await verifyTurnstile(token, ip);
  if (captchaBlock) return captchaBlock;

  // 4. Rate limit
  const maxHr = opts.maxPerHour ?? 5;
  const rlHourBlock = await rateLimit(ip, `${opts.action}-hr`, 3600, maxHr);
  if (rlHourBlock) return rlHourBlock;

  if (opts.maxPerDay) {
    const rlDayBlock = await rateLimit(ip, `${opts.action}-day`, 86400, opts.maxPerDay);
    if (rlDayBlock) return rlDayBlock;
  }

  return null;
}

// Convenience: extract client IP for storing on the row.
export function clientIp(req: Request): string {
  return getClientIp(req);
}
