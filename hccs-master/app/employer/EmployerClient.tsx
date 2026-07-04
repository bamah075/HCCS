"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function EmployerClient() {
  const { t } = useLang();
  const e = t.employer;

  return (
    <div className="bg-white">
      <section className="bg-[#0a1628] py-20 lg:py-28 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="inline-flex rounded-full border border-[#d4a84b]/30 bg-[#d4a84b]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#e8c97a] mb-6">
            {e.badge}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{e.title}</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">{e.desc}</p>
        </div>
      </section>

      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {e.highlights.map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="w-2 h-8 bg-[#d4a84b] rounded-full mb-4" />
                <h2 className="font-semibold text-slate-900 mb-2">{item.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {e.services.map((service) => (
              <Link
                key={service.title}
                href={`/services/${service.icon.toLowerCase()}`}
                className="group h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[#d4a84b]/45 hover:shadow-lg"
              >
                <div className="w-12 h-12 rounded-lg bg-[#F8F5EC] text-[#b8902f] flex items-center justify-center mb-4 text-sm font-bold tracking-wide">
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-[#b8902f] transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{service.desc}</p>
                <p className="inline-flex items-center gap-1 text-[#b8902f] text-sm font-medium">
                  {t.common.learnMore}
                  <span aria-hidden>{"->"}</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-[#1a3a52] to-[#0d1f35] text-white py-12 px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{e.ctaTitle}</h2>
          <p className="text-[#e8c97a] mb-6 max-w-2xl mx-auto">{e.ctaDesc}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/consultation"
              className="bg-[#d4a84b] hover:bg-[#b8902f] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              {e.ctaButton}
            </Link>
            <Link
              href="/compliance-scan"
              className="border border-white text-white hover:bg-white hover:text-[#0d1f35] font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              {t.common.freeScan}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
