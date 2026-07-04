import type { NextConfig } from "next";

// Security headers — applied to every response.
//
// CSP is set in report-only mode initially so we can collect violations from real
// traffic before enforcing. Switch `Content-Security-Policy-Report-Only` to
// `Content-Security-Policy` once the report stream is clean (typically 1–2 weeks
// of production traffic with no legitimate violations).
const SECURITY_HEADERS = [
  // HSTS — force HTTPS for 2 years, include subdomains, eligible for preload list.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Disallow framing the site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't sniff MIME types (XSS mitigation for served files).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the site doesn't use.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=(self)",          // AIHRChat voice input uses the mic
      "midi=()",
      "payment=(self)",             // Airwallex checkout
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  // Cross-origin isolation (modest; doesn't enable SharedArrayBuffer but tightens window references).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  // Content Security Policy — report-only initially so we can observe violations without breaking the site.
  // Allowed origins:
  //   - 'self' for the app itself
  //   - Supabase (api + storage)
  //   - AI services gateway (AIHR chat proxy target)
  //   - Airwallex (payments)
  //   - Resend / Calendly (forms)
  //   - Cloudflare Turnstile (when enabled)
  //   - YouTube / Vimeo (media embeds, if any)
  //   - Vercel telemetry
  // Inline scripts are allowed via 'unsafe-inline' as a TEMPORARY concession to Next.js inline boot scripts —
  // tighten via nonce/strict-dynamic in a follow-up pass once telemetry shows no third-party injection paths.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.airwallex.com https://www.youtube.com https://s.ytimg.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http://media.base44.com",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co https://apiservicesconnectgate.vercel.app https://*.airwallex.com https://api.resend.com https://challenges.cloudflare.com",
      "frame-src 'self' https://challenges.cloudflare.com https://*.airwallex.com https://www.youtube.com https://player.vimeo.com https://calendly.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://calendly.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "report-uri /api/security/csp-report",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Drop the Next.js identifying header
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.base44.com" },
      { protocol: "https", hostname: "osqmfupzcqlorsayiulk.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
