"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

type Feature = { id: number; text: string | null; text_cn: string | null };

type Props = {
  service: {
    title: string | null;
    title_cn: string | null;
    short_description: string | null;
    short_description_cn: string | null;
    long_description: string | null;
    long_description_cn: string | null;
  };
  featureList: Feature[];
  helpList: Feature[];
};

const FLORENCE_IMAGE =
  "https://osqmfupzcqlorsayiulk.supabase.co/storage/v1/object/public/images/people/florence-2026.jpeg";

export default function ServiceDetailClient({ service, featureList, helpList }: Props) {
  const { t, lang } = useLang();
  const sd = t.serviceDetail;
  const title =
    lang === "zh" ? (service.title_cn ?? service.title ?? "") : (service.title ?? service.title_cn ?? "");
  const shortDescription =
    lang === "zh"
      ? (service.short_description_cn ?? service.short_description)
      : (service.short_description ?? service.short_description_cn);
  const longDescription =
    lang === "zh"
      ? (service.long_description_cn ?? service.long_description)
      : (service.long_description ?? service.long_description_cn);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] py-20 sm:py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-[#e8c97a] text-sm hover:text-white transition-colors mb-7"
          >
            <span aria-hidden>←</span> {sd.allServices}
          </Link>
          <p className="eyebrow eyebrow-on-dark">{sd.badge}</p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-5">{title}</h1>
          <span className="rule-gold mb-6" />
          {shortDescription && (
            <p className="text-slate-200 text-lg max-w-2xl leading-relaxed mt-3">{shortDescription}</p>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-16">
        {/* Long description */}
        {longDescription && (
          <section>
            <p className="eyebrow">{sd.overview}</p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#0d1f35] mb-5">{sd.overview}</h2>
            <div className="prose">
              <p className="whitespace-pre-line">{longDescription}</p>
            </div>
          </section>
        )}

        {/* Features */}
        {featureList.length > 0 && (
          <section>
            <p className="eyebrow">Scope</p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#0d1f35] mb-7">{sd.whatsIncluded}</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              {featureList.map((f) => {
                const featureText =
                  lang === "zh" ? (f.text_cn ?? f.text ?? "") : (f.text ?? f.text_cn ?? "");
                return (
                  <li
                    key={f.id}
                    className="flex items-start gap-3 bg-[#F8F5EC] border border-[#e5e0d2] rounded-lg p-4"
                  >
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#1a3a52] text-[#d4a84b] flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <span className="text-slate-700 text-sm leading-relaxed">{featureText}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Help / Who this helps */}
        {helpList.length > 0 && (
          <section>
            <p className="eyebrow">Fit</p>
            <h2 className="font-display text-2xl sm:text-3xl text-[#0d1f35] mb-7">{sd.whoHelps}</h2>
            <ul className="space-y-3">
              {helpList.map((h) => {
                const helpText =
                  lang === "zh" ? (h.text_cn ?? h.text ?? "") : (h.text ?? h.text_cn ?? "");
                return (
                  <li key={h.id} className="flex items-start gap-3">
                    <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#d4a84b]" />
                    <span className="text-slate-700 text-sm leading-relaxed">{helpText}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {/* Principal credentials CTA */}
      <section className="bg-[#F8F5EC] py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow">{sd.speakWithPrincipal}</p>
            <h2 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight">
              {sd.howCanHelp}
            </h2>
            <span className="rule-gold mt-4 mx-auto" />
          </div>

          <div className="rounded-2xl bg-white border border-[#e5e0d2] overflow-hidden shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)]">
            <div className="grid lg:grid-cols-[260px_1fr]">
              {/* Portrait + stats */}
              <div className="bg-[#0d1f35] text-white p-8 flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FLORENCE_IMAGE}
                  alt={lang === "zh" ? "郭家语" : "Ker Bee Bee"}
                  className="w-28 h-28 rounded-full object-cover object-top ring-2 ring-[#d4a84b]/60 mb-5"
                />
                <p className="font-display text-xl leading-tight">{lang === "zh" ? "郭家语" : "Ker Bee Bee"}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#e8c97a] mt-2">
                  {sd.founderTitle}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-6 w-full">
                  {[
                    { v: "25+", k: sd.statYears },
                    { v: "500+", k: sd.statSMEs },
                    { v: "$5M+", k: sd.statGrants },
                    { v: "2017", k: sd.statAward },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="rounded-md border border-white/10 bg-white/[0.04] py-2.5"
                    >
                      <p className="font-display text-[#d4a84b] text-base leading-none">{s.v}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-300 mt-1">{s.k}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] uppercase tracking-[0.16em] text-[#e8c97a] font-semibold mt-6">
                  {sd.credLine}
                </p>
              </div>

              {/* Pitch + CTA */}
              <div className="p-8 sm:p-10">
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  {sd.pitchPara1}
                </p>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {sd.pitchPara2}
                </p>

                <blockquote className="font-display text-lg text-[#0d1f35] italic leading-snug border-l-2 border-[#d4a84b] pl-5 my-6">
                  {sd.quote}
                </blockquote>

                <div className="space-y-2 mb-7">
                  {[sd.bulletPrincipal, sd.bulletMomRegistered, sd.bulletGrants].map((line) => (
                    <div key={line} className="flex items-start gap-2.5">
                      <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                      <span className="text-sm text-slate-700">{line}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/consultation" className="btn-primary">
                    {sd.ctaButton}
                    <span aria-hidden>→</span>
                  </Link>
                  <a
                    href="https://wa.me/6594362866"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                  >
                    {sd.whatsappCta}
                  </a>
                </div>
                <p className="text-xs text-slate-500 mt-5">
                  {sd.footerNote}
                  <Link href="/services" className="text-[#1a3a52] hover:text-[#0d1f35] underline underline-offset-2">
                    {sd.allServices}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
