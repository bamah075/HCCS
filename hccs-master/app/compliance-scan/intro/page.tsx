"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function ComplianceScanIntroPage() {
  const router = useRouter();
  const { t } = useLang();
  const i18n = t.complianceScan.intro;
  const steps = t.complianceScan.steps;
  const [company, setCompany] = useState<{ name: string; company: string } | null>(null);
  const [qrId, setQrId] = useState("");
  const companyDetailsHref = qrId
    ? `/compliance-scan/company-details?id=${encodeURIComponent(qrId)}`
    : "/compliance-scan/company-details";
  const questionsHref = qrId
    ? `/compliance-scan/questions?id=${encodeURIComponent(qrId)}`
    : "/compliance-scan/questions";

  useEffect(() => {
    const raw = sessionStorage.getItem("cs_company");
    if (!raw) {
      router.replace("/compliance-scan/company-details");
      return;
    }
    setCompany(JSON.parse(raw));
  }, [router]);

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

  useEffect(() => {
    if (!qrId || typeof window === "undefined") {
      return;
    }

    sessionStorage.setItem("cs_qr", qrId);
  }, [qrId]);

  if (!company) return null;

  return (
    <div className="min-h-screen bg-[#F8F5EC] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-display ${i <= 1 ? "bg-[#0d1f35] text-[#d4a84b]" : "bg-white text-slate-400 border border-[#e5e0d2]"}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-6 ${i < 1 ? "bg-[#d4a84b]" : "bg-[#e5e0d2]"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)] border border-[#e5e0d2] p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1a3a52]/5 border border-[#1a3a52]/15 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl" aria-hidden>📋</span>
            </div>
            <p className="eyebrow">Step 2</p>
            <h1 className="font-display text-2xl sm:text-3xl text-[#0d1f35] leading-tight mb-3">
              {i18n.helloPrefix}{company.name.split(" ")[0]}!
            </h1>
            <span className="rule-gold mx-auto mb-4" />
            <p className="text-sm text-slate-600 leading-relaxed">
              {i18n.aboutPrefix}<span className="font-semibold text-[#0d1f35]">{company.company}</span>{i18n.aboutSuffix}
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="bg-[#F8F5EC] border border-[#e5e0d2] rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg flex-shrink-0" aria-hidden>⏱</span>
              <div>
                <p className="text-sm font-semibold text-[#0d1f35]">{i18n.timingTitle}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{i18n.timingDesc}</p>
              </div>
            </div>
            <div className="bg-[#F8F5EC] border border-[#e5e0d2] rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg flex-shrink-0" aria-hidden>✅</span>
              <div>
                <p className="text-sm font-semibold text-[#0d1f35]">{i18n.honestTitle}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{i18n.honestDesc}</p>
              </div>
            </div>
            <div className="bg-[#F8F5EC] border border-[#e5e0d2] rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg flex-shrink-0" aria-hidden>📊</span>
              <div>
                <p className="text-sm font-semibold text-[#0d1f35]">{i18n.resultsTitle}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{i18n.resultsDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={companyDetailsHref} className="btn-ghost flex-1">
              {i18n.back}
            </Link>
            <Link href={questionsHref} className="btn-primary flex-1">
              {i18n.start}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
