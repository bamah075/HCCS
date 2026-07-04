"use client";

export const dynamic = "force-dynamic";

import { useLang } from "@/lib/i18n";

const FREE_CONSULTATION_URL = "https://calendly.com/calendar-hccs/expert-advisory";
const EXPERT_ADVISORY_URL = "https://calendly.com/florence-hccs/paid-consultation";

export default function ConsultationPage() {
  const { t } = useLang();
  const c = t.consultation;

  return (
    <div className="bg-[#F8F5EC] min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Header */}
        <header className="text-center mb-12">
          <p className="eyebrow">Book a session</p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight mb-4">
            {c.title}
          </h1>
          <span className="rule-gold mx-auto" />
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mt-6">
            {c.subtitle}
          </p>
        </header>

        {/* Consultation type selector */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          {/* Free Consultation */}
          <a
            href={FREE_CONSULTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group card card-interactive p-7 bg-white flex flex-col text-left"
          >
            <span className="self-start inline-flex items-center rounded-full bg-[#d4a84b]/12 text-[#b8902f] border border-[#d4a84b]/40 text-xs font-semibold uppercase tracking-[0.16em] px-2.5 py-1">
              {c.freeTag}
            </span>
            <div className="flex items-start gap-3 mt-5">
              <span className="text-2xl" aria-hidden>📅</span>
              <div>
                <p className="font-display text-xl text-[#0d1f35] leading-tight">{c.freeTitle}</p>
                <p className="font-display text-3xl text-[#0d1f35] mt-1">S$0</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#1a3a52] mt-4">{c.freeDuration}</p>
            <ul className="text-sm text-slate-700 space-y-2 mt-3">
              {c.freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#b8902f] group-hover:gap-2 transition-all">
              {c.freeCta}
              <span aria-hidden>→</span>
            </span>
          </a>

          {/* Expert Advisory — mirrors the Free card's light style so body text reads in uniform black */}
          <a
            href={EXPERT_ADVISORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group card card-interactive p-7 bg-white flex flex-col text-left"
          >
            <span className="self-start inline-flex items-center rounded-full bg-[#d4a84b]/12 text-[#b8902f] border border-[#d4a84b]/40 text-xs font-semibold uppercase tracking-[0.16em] px-2.5 py-1">
              {c.expertTag}
            </span>
            <div className="flex items-start gap-3 mt-5">
              <span className="text-2xl" aria-hidden>💼</span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#b8902f]">{c.expertLabel}</p>
                <p className="font-display text-xl text-[#0d1f35] leading-tight mt-1">{c.expertTitle}</p>
                <p className="font-display text-3xl text-[#0d1f35] mt-1">{c.expertPrice}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#1a3a52] mt-4">{c.expertDuration}</p>
            <ul className="text-sm text-slate-700 space-y-2 mt-3">
              {c.expertFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#b8902f] group-hover:gap-2 transition-all">
              {c.expertCta}
              <span aria-hidden>→</span>
            </span>
          </a>
        </div>

        <p className="text-xs text-slate-500 text-center">
          {t.footer.bilingualNote}
        </p>
      </div>
    </div>
  );
}
