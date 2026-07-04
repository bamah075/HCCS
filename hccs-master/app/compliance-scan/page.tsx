"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

export default function ComplianceScanCoverPage() {
  const { t } = useLang();
  const cs = t.complianceScan;
  const [qrId, setQrId] = useState("");
  const nextHref = qrId
    ? `/compliance-scan/company-details?id=${encodeURIComponent(qrId)}`
    : "/compliance-scan/company-details";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const id = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
    setQrId(id);

    if (!id) {
      return;
    }

    sessionStorage.setItem("cs_qr", id);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] text-white py-20 sm:py-24 px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#2a5a8a]/20 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="eyebrow eyebrow-on-dark">{cs.badge}</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mb-5 leading-[1.05]">{cs.title}</h1>
          <span className="rule-gold mx-auto mb-6" />
          <p className="text-slate-200 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">{cs.desc}</p>
          <Link href={nextHref} className="btn-primary">
            {cs.startScan}
            <span aria-hidden>→</span>
          </Link>
          <p className="text-slate-300/80 text-xs mt-5">{cs.takesNote}</p>
        </div>
      </section>

      {/* What you'll get */}
      <section className="py-20 px-4 bg-[#F8F5EC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="eyebrow">{cs.deliverablesEyebrow}</p>
            <h2 className="section-title">{cs.whatYouReceive}</h2>
            <span className="rule-gold mx-auto mt-4" />
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {cs.receiveItems.map((item) => (
              <div key={item.title} className="card p-7 bg-white text-center">
                <div className="text-3xl mb-4" aria-hidden>{item.icon}</div>
                <h3 className="font-display text-lg text-[#0d1f35] mb-2 leading-tight">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas covered */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow">{cs.scopeEyebrow}</p>
            <h2 className="section-title">{cs.areasTitle}</h2>
            <span className="rule-gold mx-auto mt-4" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {cs.areas.map((area, i) => (
              <div key={area} className="flex flex-col items-center justify-center bg-[#F8F5EC] border border-[#e5e0d2] rounded-xl p-5 text-center hover:border-[#d4a84b]/55 transition-colors">
                <span className="font-display text-[#d4a84b] text-base mb-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm font-medium text-[#0d1f35] leading-tight">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="relative overflow-hidden py-20 px-4 bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] text-white text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[#d4a84b]/12 blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <p className="eyebrow eyebrow-on-dark">{cs.runItNowEyebrow}</p>
          <h2 className="font-display text-3xl sm:text-4xl mb-3 leading-tight">{cs.ctaTitle}</h2>
          <span className="rule-gold mx-auto mb-5" />
          <p className="text-slate-300 mb-7 leading-relaxed">{cs.ctaDesc}</p>
          <Link href={nextHref} className="btn-primary">
            {cs.ctaButton}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
