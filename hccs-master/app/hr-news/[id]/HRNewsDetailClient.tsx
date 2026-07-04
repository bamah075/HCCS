"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export type NewsDetailRow = {
  id: number;
  title: string | null;
  title_cn: string | null;
  body: string | null;
  body_cn: string | null;
  url: string | null;
  agency_name: string | null;
  content_type: string | null;
  hero_image: string | null;
  published_at: string | null;
  is_published: boolean | null;
};

function hostnameOf(url: string | null): string {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function formatDate(iso: string | null, lang: "en" | "zh"): string {
  if (!iso) return "";
  try {
    const locale = lang === "zh" ? "zh-SG" : "en-SG";
    return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export default function HRNewsDetailClient({ article }: { article: NewsDetailRow | null }) {
  const { t, lang } = useLang();
  const h = t.hrNews;

  if (!article) {
    return (
      <div className="bg-[#F8F5EC] min-h-[70vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl bg-white border border-[#e5e0d2] p-12 text-center">
            <p className="font-display text-2xl text-[#0d1f35] mb-3">{h.detailNotFoundTitle}</p>
            <span className="rule-gold mx-auto mb-5" />
            <p className="text-slate-600 leading-relaxed mb-7">{h.detailNotFoundBody}</p>
            <Link href="/hr-news" className="btn-primary">{h.backToList}</Link>
          </div>
        </div>
      </div>
    );
  }

  const title = (lang === "zh" ? article.title_cn ?? article.title : article.title ?? article.title_cn) ?? "";
  const body = lang === "zh" ? article.body_cn ?? article.body : article.body ?? article.body_cn;
  const dateLabel = formatDate(article.published_at, lang);
  const host = hostnameOf(article.url);

  return (
    <div className="bg-[#F8F5EC] min-h-[70vh]">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <Link
            href="/hr-news"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-semibold text-[#1a3a52] hover:text-[#d4a84b] transition-colors"
          >
            <span aria-hidden>←</span>
            {h.backToList}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          {article.agency_name && (
            <span className="inline-flex items-center rounded-full bg-[#1a3a52]/[0.06] border border-[#1a3a52]/15 text-[#1a3a52] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 text-[10px]">
              {article.agency_name}
            </span>
          )}
          {dateLabel && (
            <span className="text-slate-500 font-medium">{dateLabel}</span>
          )}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight mb-6">
          {title}
        </h1>
        <span className="rule-gold mb-8" />

        {article.hero_image && (
          <div className="rounded-2xl overflow-hidden border border-[#e5e0d2] mb-10 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.hero_image}
              alt={title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {body && (
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-[1.05rem]">
            {body}
          </div>
        )}

        {article.url && (
          <div className="mt-12 pt-8 border-t border-[#e5e0d2] flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{h.readOriginal}</span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b8902f] hover:gap-2 transition-all"
            >
              {host || article.url}
              <span aria-hidden>→</span>
            </a>
          </div>
        )}

        <div className="mt-16 rounded-2xl bg-[#0d1f35] text-white p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#d4a84b]/10 blur-3xl" />
          <div className="relative">
            <p className="eyebrow eyebrow-on-dark">{h.ctaEyebrow}</p>
            <h2 className="font-display text-xl sm:text-2xl leading-tight mb-3">{h.ctaTitle}</h2>
            <span className="rule-gold mx-auto mb-5" />
            <p className="text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">{h.ctaBody}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/consultation" className="btn-primary">
                {h.ctaBook}
                <span aria-hidden>→</span>
              </Link>
              <Link href="/compliance-scan-v1" className="btn-on-dark">
                {h.ctaScan}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
