"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function EmploymentLawsClient() {
  const { t } = useLang();
  const el = t.employmentLaws;

  return (
    <div className="bg-[#F8F5EC] min-h-[60vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Header */}
        <header className="text-center mb-14">
          <p className="eyebrow">Reference</p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] mb-4 leading-tight">
            {el.title}
          </h1>
          <span className="rule-gold mx-auto" />
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mt-6">{el.desc}</p>
        </header>

        {/* Laws */}
        <section className="space-y-6">
          {el.laws.map((law) => (
            <article
              key={law.name}
              className="card card-interactive p-6 sm:p-7 bg-white"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a3a52]/5 text-2xl border border-[#1a3a52]/15">
                  {law.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="font-display text-lg sm:text-xl text-[#0d1f35]">
                      {law.name}
                    </h2>
                    <span className="text-xs font-semibold bg-[#d4a84b]/12 text-[#b8902f] border border-[#d4a84b]/40 px-2.5 py-0.5 rounded-full">
                      {law.short}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-5 leading-relaxed">{law.desc}</p>
                  <div className="rounded-lg bg-[#F8F5EC] border border-[#e5e0d2] p-4 mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8902f] mb-3">
                      {el.keyPoints}
                    </h3>
                    <ul className="space-y-2">
                      {law.keyPoints.map((pt) => (
                        <li
                          key={pt}
                          className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
                        >
                          <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={law.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#1a3a52] hover:text-[#0d1f35] font-semibold"
                  >
                    {el.readMore}
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* CTA card */}
        <aside className="mt-16 rounded-2xl bg-[#0d1f35] text-white p-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#d4a84b]/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-xl sm:text-2xl mb-3">{el.ctaTitle}</h2>
            <span className="rule-gold mb-5" />
            <p className="text-slate-300 mb-7 max-w-2xl mx-auto leading-relaxed">{el.ctaDesc}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/compliance-scan" className="btn-primary">
                {el.ctaButton}
              </Link>
              <Link href="/consultation" className="btn-on-dark">
                {t.common.bookFreeConsultation}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
