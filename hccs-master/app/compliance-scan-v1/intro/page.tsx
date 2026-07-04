"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function ComplianceScanIntroPage() {
  const router = useRouter();
  const { t } = useLang();
  const i18n = t.complianceScanV1.intro;
  const steps = t.complianceScanV1.steps;
  const [company, setCompany] = useState<{ name: string; company: string } | null>(null);
  const [qrId, setQrId] = useState("");
  const companyDetailsHref = qrId
    ? `/compliance-scan-v1/company-details?id=${encodeURIComponent(qrId)}`
    : "/compliance-scan-v1/company-details";
  const questionsHref = qrId
    ? `/compliance-scan-v1/questions?id=${encodeURIComponent(qrId)}`
    : "/compliance-scan-v1/questions";

  useEffect(() => {
    const raw = sessionStorage.getItem("cs_company");
    if (!raw) {
      router.replace("/compliance-scan-v1/company-details");
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i <= 1 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-6 ${i < 1 ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {i18n.helloPrefix}{company.name.split(" ")[0]}!
            </h1>
            <p className="text-slate-500 text-sm">
              {i18n.aboutPrefix}<span className="font-semibold text-slate-700">{company.company}</span>{i18n.aboutSuffix}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg">⏱</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{i18n.timingTitle}</p>
                <p className="text-xs text-slate-500 mt-0.5">{i18n.timingDesc}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{i18n.honestTitle}</p>
                <p className="text-xs text-slate-500 mt-0.5">{i18n.honestDesc}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-lg">📊</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{i18n.resultsTitle}</p>
                <p className="text-xs text-slate-500 mt-0.5">{i18n.resultsDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={companyDetailsHref}
              className="flex-1 text-center border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-lg text-sm transition-colors"
            >
              {i18n.back}
            </Link>
            <Link
              href={questionsHref}
              className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {i18n.start}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
