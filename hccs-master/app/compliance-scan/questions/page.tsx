"use client";

export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/i18n";

type Option = { text: string; score: number };
type Question = {
  id: number;
  question: string;
  evidence?: string;
  category: string;
  options: Option[];
  criticalOverride?: boolean;
};

// Workplace Fairness Act readiness checklist — 20 binary questions.
// Scoring: Yes = 0 (compliant), No = 2 (gap). Max possible total = 40.
// criticalOverride: any "No" pushes risk straight to HIGH (foundational policies).
const questionMeta = [
  { id: 1,  scores: [0, 2], criticalOverride: true }, // Workplace Fairness Policy
  { id: 2,  scores: [0, 2] }, // Senior management approval
  { id: 3,  scores: [0, 2] }, // Policy communicated to all employees
  { id: 4,  scores: [0, 2] }, // Job ads free from discriminatory wording
  { id: 5,  scores: [0, 2] }, // Standardised interview questions
  { id: 6,  scores: [0, 2] }, // Hiring decisions documented objectively
  { id: 7,  scores: [0, 2] }, // Compensation applied consistently
  { id: 8,  scores: [0, 2] }, // Appraisal criteria objective and measurable
  { id: 9,  scores: [0, 2] }, // Promotion opportunities communicated fairly
  { id: 10, scores: [0, 2], criticalOverride: true }, // Anti-harassment policy
  { id: 11, scores: [0, 2], criticalOverride: true }, // Grievance handling policy
  { id: 12, scores: [0, 2] }, // Complaint channels published
  { id: 13, scores: [0, 2] }, // Employee awareness training
  { id: 14, scores: [0, 2] }, // Retaliation prohibited
  { id: 15, scores: [0, 2] }, // Promotion trends analysed
  { id: 16, scores: [0, 2] }, // Third-party / recruitment agency fairness
  { id: 17, scores: [0, 2] }, // Older workers treated fairly
  { id: 18, scores: [0, 2] }, // Reasonable accommodations considered
  { id: 19, scores: [0, 2] }, // HR policies version-controlled
  { id: 20, scores: [0, 2] }, // WFA readiness assessment performed
];

// 5 broader audit areas for the breakdown chart.
const categoryMap: Record<string, number[]> = {
  "Policy & Governance":        [1, 2, 3, 10, 14, 19],
  "Hiring & Selection":         [4, 5, 6],
  "Employee Lifecycle":         [7, 8, 9, 17, 18],
  "Reporting & Grievance":      [11, 12, 13],
  "Compliance & Analytics":     [15, 16, 20],
};

type AnswerRecord = Record<number, { optionIndex: number; score: number }>;

function calcResult(answers: AnswerRecord) {
  let totalScore = 0;
  let hasCriticalOverride = false;
  questionMeta.forEach((q) => {
    const a = answers[q.id];
    if (a) {
      totalScore += a.score;
      if (q.criticalOverride && a.score === 2) hasCriticalOverride = true;
    }
  });
  // Max possible = 40 (20 questions × 2).
  // LOW    : 0–9   (≤22% gaps)
  // MEDIUM : 10–23 (25–58% gaps)
  // HIGH   : ≥24, or any critical-override "No"
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (hasCriticalOverride || totalScore >= 24) riskLevel = "HIGH";
  else if (totalScore >= 10) riskLevel = "MEDIUM";
  return { totalScore, riskLevel, hasCriticalOverride };
}

function getPrimaryRisk(answers: AnswerRecord, mixedLabel: string, generalLabel: string) {
  const categoryScores: Record<string, number> = {};
  Object.entries(categoryMap).forEach(([cat, ids]) => {
    categoryScores[cat] = ids.reduce((sum, id) => sum + (answers[id]?.score ?? 0), 0);
  });
  const max = Math.max(...Object.values(categoryScores));
  const top = Object.entries(categoryScores).filter(([, v]) => v === max).map(([k]) => k);
  return top.length > 1 ? mixedLabel : top[0] ?? generalLabel;
}

function getAlerts(answers: AnswerRecord, policyAlert: string, hiringAlert: string, grievanceAlert: string): string[] {
  const alerts: string[] = [];
  const policyScore = categoryMap["Policy & Governance"].reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
  if (policyScore >= 4) alerts.push(policyAlert);
  const hiringScore = categoryMap["Hiring & Selection"].reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
  if (hiringScore >= 2) alerts.push(hiringAlert);
  const grievanceScore = categoryMap["Reporting & Grievance"].reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
  if (grievanceScore >= 2) alerts.push(grievanceAlert);
  return alerts;
}

const riskColors = {
  LOW:    { color: "text-[#1a3a52]", bar: "bg-[#d4a84b]", border: "border-[#e5e0d2]", bg: "bg-[#F8F5EC]" },
  MEDIUM: { color: "text-[#b8902f]",   bar: "bg-[#d4a84b]",   border: "border-[#d4a84b]/40", bg: "bg-[#d4a84b]/10" },
  HIGH:   { color: "text-red-600",     bar: "bg-red-500",     border: "border-red-200",     bg: "bg-red-50" },
};

const StepIndicator = ({ activeStep }: { activeStep: number }) => {
  void activeStep;
  return null;
};

export default function ComplianceScanQuestionsPage() {
  const router = useRouter();
  const { t } = useLang();
  const qp = t.complianceScan.questionsPage;
  const [qrFromUrl, setQrFromUrl] = useState("");

  // Build questions from locale text + static scores
  const questions: Question[] = qp.questions.map((locQ, idx) => {
    const meta = questionMeta[idx];
    return {
      id: idx + 1,
      question: locQ.question,
      evidence: (locQ as { evidence?: string }).evidence,
      category: Object.entries(categoryMap).find(([, ids]) => ids.includes(idx + 1))?.[0] ?? "",
      options: locQ.options.map((text, optIdx) => ({
        text,
        score: meta?.scores[optIdx] ?? 0,
      })),
      criticalOverride: meta?.criticalOverride,
    };
  });
  const [answers, setAnswers] = useState<AnswerRecord>({});
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const company = useMemo<{ name?: string; company?: string } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = sessionStorage.getItem("cs_company");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as { name?: string; company?: string };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!company) {
      router.replace("/compliance-scan/company-details");
    }
  }, [company, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const id = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
    setQrFromUrl(id);

    if (!id) {
      return;
    }

    sessionStorage.setItem("cs_qr", id);
  }, []);

  useEffect(() => {
    if (!qrFromUrl || typeof window === "undefined") {
      return;
    }

    sessionStorage.setItem("cs_qr", qrFromUrl);
  }, [qrFromUrl]);

  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;
  const progress = (answered / questions.length) * 100;

  function handleSelect(questionId: number, optionIndex: number, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { optionIndex, score } }));
  }

  async function handleSubmit() {
    setProcessing(true);
    const { totalScore, riskLevel, hasCriticalOverride } = calcResult(answers);
    const primaryRisk = getPrimaryRisk(answers, qp.mixedRisk, qp.generalCompliance);
    const alerts = getAlerts(answers, qp.momAlert, qp.cpfAlert, qp.tafepAlert);
    const recommendations = qp.riskLevels[riskLevel]?.recommendations ?? [];
    const qr = sessionStorage.getItem("cs_qr") || qrFromUrl || null;
    const resultsPayload = {
      qr,
      totalScore,
      riskLevel,
      hasCriticalOverride,
      primaryRisk,
      alerts,
      recommendations,
      answers: Object.entries(answers).map(([qId, a]) => {
        const q2 = questions.find((q3) => q3.id === Number(qId));
        return {
          question_number: Number(qId),
          question: q2?.question ?? "",
          evidence: q2?.evidence ?? "",
          category: q2?.category ?? "",
          selected: q2?.options[a.optionIndex]?.text ?? "",
          score: a.score,
        };
      }),
    };

    const raw = sessionStorage.getItem("cs_company");
    const companyData = raw ? JSON.parse(raw) : {};

    const formPayload = {
      qr,
      company_name: companyData.company ?? null,
      contact_name: companyData.name ?? null,
      business_email: companyData.email ?? null,
      contact_number: companyData.phone ?? null,
      industry: companyData.industry ?? null,
      employess: companyData.size ?? null,
      has_foreign_workers: companyData.foreignWorkers === true ? 1 : 0,
      results: resultsPayload,
    };

    const res = await fetch("/api/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload),
    });

    if (res.ok) {
      setProcessing(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setProcessing(false);
     
    // supabase
    //   .from("compliance_scan")
    //   .insert({
    //     company_name: companyData.company ?? null,
    //     contact_name: companyData.name ?? null,
    //     business_email: companyData.email ?? null,
    //     contact_number: companyData.phone ?? null,
    //     industry: companyData.industry ?? null,
    //     employess: companyData.size ?? null,
    //     has_foreign_workers: companyData.foreignWorkers === true ? 1 : 0,
    //     results: resultsPayload,
    //   })
    //   .then(() => {
    //     setProcessing(false);
    //     setSubmitted(true);
    //     window.scrollTo({ top: 0, behavior: "smooth" });
    //   });
  }

  async function handleExportPDF() {
    // Re-build the same payload shape as handleSubmit so the downloaded PDF
    // matches the admin's report exactly. Hits /api/compliance/download which
    // generates the PDF server-side using the same jsPDF layout as the admin panel.
    const { totalScore, riskLevel, hasCriticalOverride } = calcResult(answers);
    const primaryRisk = getPrimaryRisk(answers, qp.mixedRisk, qp.generalCompliance);
    const alerts = getAlerts(answers, qp.momAlert, qp.cpfAlert, qp.tafepAlert);
    const recommendations = qp.riskLevels[riskLevel]?.recommendations ?? [];
    const resultsPayload = {
      totalScore,
      riskLevel,
      hasCriticalOverride,
      primaryRisk,
      alerts,
      recommendations,
      answers: Object.entries(answers).map(([qId, a]) => {
        const q2 = questions.find((q3) => q3.id === Number(qId));
        return {
          question_number: Number(qId),
          question: q2?.question ?? "",
          evidence: q2?.evidence ?? "",
          category: q2?.category ?? "",
          selected: q2?.options[a.optionIndex]?.text ?? "",
          score: a.score,
        };
      }),
    };
    const raw = sessionStorage.getItem("cs_company");
    const companyData = raw ? JSON.parse(raw) : {};
    const downloadPayload = {
      company_name: companyData.company ?? null,
      contact_name: companyData.name ?? null,
      business_email: companyData.email ?? null,
      contact_number: companyData.phone ?? null,
      industry: companyData.industry ?? null,
      employess: companyData.size ?? null,
      has_foreign_workers: companyData.foreignWorkers === true ? 1 : 0,
      results: resultsPayload,
    };

    try {
      const res = await fetch("/api/compliance/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(downloadPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (companyData.company || "compliance")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      a.download = `HCCS-Compliance-Report_${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      // Fallback: trigger the browser's print dialog (same behaviour as before).
      window.print();
    }
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-[#F8F5EC] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 border-4 border-[#d4a84b] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl text-[#0d1f35] mb-2">{qp.analysing}</h2>
          <span className="rule-gold mx-auto mb-4" />
          <p className="text-slate-600 text-sm leading-relaxed">{qp.analysingDesc}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const { totalScore, riskLevel } = calcResult(answers);
    const primaryRisk = getPrimaryRisk(answers, qp.mixedRisk, qp.generalCompliance);
    const alerts = getAlerts(answers, qp.momAlert, qp.cpfAlert, qp.tafepAlert);
    const cfg = { ...riskColors[riskLevel], ...qp.riskLevels[riskLevel] };
    const maxScore = questionMeta.reduce((s, q2) => s + Math.max(...q2.scores), 0);
    const riskPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Translate the category labels via locale lookup
    const catName = (cat: string): string =>
      (qp as { categoryNames?: Record<string, string> }).categoryNames?.[cat] ?? cat;

    return (
      <div className="min-h-screen bg-[#F8F5EC] px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <StepIndicator activeStep={3} />

          <div className="text-center mb-8">
            <p className="eyebrow">Step 3 — Your results</p>
            <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight mb-3">{qp.resultsHeading}</h1>
            <span className="rule-gold mx-auto mb-4" />
            {company && <p className="text-slate-600 text-sm">{company.company}</p>}
          </div>

          <div className="bg-white border border-[#e5e0d2] rounded-2xl shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)] p-8 sm:p-10 mb-6">
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-[#1a3a52] uppercase tracking-[0.18em] mb-2">{qp.totalScore}</p>
                <p className="font-display text-5xl sm:text-6xl text-[#0d1f35] leading-none">
                  {totalScore}
                  <span className="text-lg sm:text-xl text-slate-500 font-normal ml-2">{qp.outOf} {maxScore} {qp.points}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#1a3a52] uppercase tracking-[0.18em] mb-2">{qp.riskLevelLabel}</p>
                <p className={`font-display text-xl sm:text-2xl ${cfg.color}`}>{cfg.label}</p>
              </div>
            </div>

            <div className="w-full bg-[#F8F5EC] rounded-full h-3 mb-5 border border-[#e5e0d2]">
              <div className={`h-3 rounded-full transition-all ${cfg.bar}`} style={{ width: `${riskPct}%` }} />
            </div>

            <p className="font-semibold text-[#0d1f35] mb-2">{cfg.subtitle}</p>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{cfg.description}</p>

            <div className="flex items-center gap-2 mb-5 pt-5 border-t border-[#e5e0d2]">
              <span className="text-[10px] font-semibold text-[#1a3a52] uppercase tracking-[0.18em]">{qp.primaryRiskLabel}</span>
              <span className="text-sm font-semibold text-[#0d1f35]">{catName(primaryRisk)}</span>
            </div>

            {alerts.length > 0 && (
              <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 mb-5`}>
                <ul className="space-y-2">
                  {alerts.map((alert) => (
                    <li key={alert} className="text-sm text-slate-700 flex gap-2">
                      <span className="flex-shrink-0" aria-hidden>⚠️</span>
                      <span className="leading-relaxed">{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl bg-[#F8F5EC] border border-[#e5e0d2] p-5 mb-5">
              <h3 className="text-[10px] font-semibold text-[#b8902f] uppercase tracking-[0.18em] mb-4">{qp.breakdownTitle}</h3>
              <div className="space-y-3">
                {Object.entries(categoryMap).map(([cat, ids]) => {
                  const catScore = ids.reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
                  const catMax = ids.reduce((s, id) => {
                    const meta = questionMeta.find((qi) => qi.id === id);
                    return s + (meta ? Math.max(...meta.scores) : 0);
                  }, 0);
                  const pct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-[#0d1f35] font-medium w-40 flex-shrink-0">{catName(cat)}</span>
                      <div className="flex-1 bg-white rounded-full h-2 border border-[#e5e0d2]">
                        <div
                          className={`h-2 rounded-full ${pct >= 75 ? "bg-red-500" : pct >= 40 ? "bg-[#d4a84b]" : "bg-[#d4a84b]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right font-mono">{catScore}/{catMax}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0d1f35] rounded-xl p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#d4a84b]/15 blur-2xl" />
              <h3 className="font-display text-white text-base mb-3">{qp.nextStepsTitle}</h3>
              <span className="rule-gold mb-3" />
              <ul className="space-y-2 mt-3">
                {cfg.recommendations.map((rec) => (
                  <li key={rec} className="text-sm text-slate-200 flex gap-2.5 leading-relaxed">
                    <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center mb-7 print:hidden leading-relaxed">{qp.disclaimer}</p>

          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <Link href="/consultation" className="btn-primary flex-1">
              {qp.bookReview}
              <span aria-hidden>→</span>
            </Link>
            <button onClick={handleExportPDF} className="btn-ghost flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {qp.downloadPDF}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const catNameLookup = (cat: string): string =>
    (qp as { categoryNames?: Record<string, string> }).categoryNames?.[cat] ?? cat;
  const evidenceLbl = (qp as { evidenceLabel?: string }).evidenceLabel ?? "Evidence";

  return (
    <div className="min-h-screen bg-[#F8F5EC] px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <StepIndicator activeStep={2} />

        <div className="text-center mb-4">
          <p className="eyebrow">Step 3 — Assessment</p>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0d1f35] leading-tight mb-3">{qp.heading}</h1>
          <span className="rule-gold mx-auto" />
        </div>

        <div className="flex items-center justify-between mb-3 mt-7">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">{qp.answeredLabel}</span>
          <span className="text-sm font-display text-[#0d1f35]">{answered}<span className="text-slate-400">/{questions.length}</span></span>
        </div>

        <div className="w-full bg-white rounded-full h-2 mb-8 border border-[#e5e0d2] overflow-hidden">
          <div className="bg-[#d4a84b] h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((q, i) => {
            const currentAnswer = answers[q.id];
            return (
              <div key={q.id} className="bg-white border border-[#e5e0d2] rounded-xl p-5 sm:p-6 shadow-[0_8px_20px_-12px_rgba(13,31,53,0.10)]">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#0d1f35] text-[#d4a84b] text-xs font-display flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center text-[10px] font-semibold text-[#b8902f] uppercase tracking-[0.18em] bg-[#d4a84b]/10 border border-[#d4a84b]/30 px-2 py-0.5 rounded-full">
                      {catNameLookup(q.category)}
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-[#0d1f35] mt-2 leading-snug">{q.question}</p>
                    {q.evidence && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-[#F8F5EC] border border-[#e5e0d2] rounded-md px-3 py-2">
                        <span className="font-semibold text-[#1a3a52]">{evidenceLbl}: </span>
                        {q.evidence}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-row gap-3 sm:pl-11">
                  {q.options.map((opt, optIdx) => {
                    const selected = currentAnswer?.optionIndex === optIdx;
                    return (
                      <button
                        key={opt.text}
                        onClick={() => handleSelect(q.id, optIdx, opt.score)}
                        className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                          selected
                            ? "bg-[#0d1f35] text-white border-[#0d1f35]"
                            : "bg-white text-slate-700 border-[#e5e0d2] hover:border-[#d4a84b]"
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/compliance-scan/intro" className="btn-ghost px-6">
            {qp.back}
          </Link>
          <button
            disabled={!allAnswered}
            onClick={handleSubmit}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {allAnswered ? qp.submitReady : qp.submitWaiting}
          </button>
        </div>
      </div>
    </div>
  );
}
