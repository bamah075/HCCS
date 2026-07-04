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
  category: string;
  options: Option[];
  criticalOverride?: boolean;
};

// Scores only — text comes from locale.
// Q1–Q10: original 10 broad HR-compliance questions (3-option, 0/1/2).
// Q11–Q30: 20 Workplace Fairness Act readiness questions (2-option, 0/2).
// Max possible total = 20 (Q1–10) + 40 (Q11–30) = 60.
const questionMeta = [
  // Q1–Q10 — original HR compliance health-check
  { id: 1,  scores: [2, 1, 0] },                                    // Foreign workforce complexity (reversed: "many"=2)
  { id: 2,  scores: [0, 1, 2], criticalOverride: true },            // CPF
  { id: 3,  scores: [0, 1, 2], criticalOverride: true },            // Employment contracts
  { id: 4,  scores: [0, 1, 2], criticalOverride: true },            // Itemised payslips
  { id: 5,  scores: [0, 1, 2], criticalOverride: true },            // Foreign employees roles aligned
  { id: 6,  scores: [0, 1, 2] },                                    // HR records
  { id: 7,  scores: [0, 1, 2] },                                    // Termination process
  { id: 8,  scores: [0, 1, 2], criticalOverride: true },            // Fair hiring (TAFEP)
  { id: 9,  scores: [0, 1, 2] },                                    // Monitor MOM/CPF/TAFEP updates
  { id: 10, scores: [0, 1, 2] },                                    // Dedicated HR expertise
  // Q11–Q30 — WFA readiness (Yes=0 / No=2)
  { id: 11, scores: [0, 2], criticalOverride: true },               // Workplace Fairness Policy (foundational)
  { id: 12, scores: [0, 2] },                                       // Senior management approval
  { id: 13, scores: [0, 2] },                                       // Policy communicated to all
  { id: 14, scores: [0, 2] },                                       // Job ads free from discrim. wording
  { id: 15, scores: [0, 2] },                                       // Standardised interview questions
  { id: 16, scores: [0, 2] },                                       // Hiring decisions documented objectively
  { id: 17, scores: [0, 2] },                                       // Compensation applied consistently
  { id: 18, scores: [0, 2] },                                       // Appraisal criteria objective
  { id: 19, scores: [0, 2] },                                       // Promotion opportunities communicated
  { id: 20, scores: [0, 2], criticalOverride: true },               // Anti-harassment policy (foundational)
  { id: 21, scores: [0, 2], criticalOverride: true },               // Grievance handling policy (foundational)
  { id: 22, scores: [0, 2] },                                       // Complaint channels published
  { id: 23, scores: [0, 2] },                                       // Employee awareness training
  { id: 24, scores: [0, 2] },                                       // Retaliation prohibited
  { id: 25, scores: [0, 2] },                                       // Promotion trends analysed
  { id: 26, scores: [0, 2] },                                       // 3rd-party recruitment fairness
  { id: 27, scores: [0, 2] },                                       // Older workers treated fairly
  { id: 28, scores: [0, 2] },                                       // Reasonable accommodations
  { id: 29, scores: [0, 2] },                                       // HR policies version-controlled
  { id: 30, scores: [0, 2] },                                       // WFA readiness assessment performed
];

// 10 categories total (5 from original HR-compliance + 5 from WFA).
const categoryMap: Record<string, number[]> = {
  MOM: [3, 4, 5, 6, 7],
  CPF: [2],
  TAFEP: [8],
  Governance: [9, 10],
  "Workforce Complexity": [1],
  "Policy & Governance":     [11, 12, 13, 20, 24, 29],
  "Hiring & Selection":      [14, 15, 16],
  "Employee Lifecycle":      [17, 18, 19, 27, 28],
  "Reporting & Grievance":   [21, 22, 23],
  "Compliance & Analytics":  [25, 26, 30],
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
  // Max possible = 60. Thresholds scaled proportionally from the original models:
  //   - original 10:  HIGH ≥13/20 (65%),  MEDIUM ≥6/20 (30%)
  //   - WFA 20:       HIGH ≥24/40 (60%),  MEDIUM ≥10/40 (25%)
  //   - merged 30:    HIGH ≥37/60 (~62%), MEDIUM ≥15/60 (25%)
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (hasCriticalOverride || totalScore >= 37) riskLevel = "HIGH";
  else if (totalScore >= 15) riskLevel = "MEDIUM";
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

function getAlerts(answers: AnswerRecord, momAlert: string, cpfAlert: string, tafepAlert: string): string[] {
  const alerts: string[] = [];
  const momScore = categoryMap.MOM.reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
  if (momScore > 0) alerts.push(momAlert);
  const cpfAnswer = answers[2];
  if (cpfAnswer && cpfAnswer.score > 0) alerts.push(cpfAlert);
  const tafepAnswer = answers[8];
  if (tafepAnswer && tafepAnswer.score > 0) alerts.push(tafepAlert);
  return alerts;
}

const riskColors = {
  LOW:    { color: "text-green-600",  bar: "bg-green-500",  border: "border-green-200",  bg: "bg-green-50"  },
  MEDIUM: { color: "text-amber-600",  bar: "bg-amber-500",  border: "border-amber-200",  bg: "bg-amber-50"  },
  HIGH:   { color: "text-red-600",    bar: "bg-red-500",    border: "border-red-200",    bg: "bg-red-50"    },
};

const StepIndicator = ({ activeStep }: { activeStep: number }) => {
  void activeStep;
  return null;
};

export default function ComplianceScanQuestionsPage() {
  const router = useRouter();
  const { t } = useLang();
  const qp = t.complianceScanV1.questionsPage;
  const [qrFromUrl, setQrFromUrl] = useState("");

  // Build questions from locale text + static scores
  const questions: Question[] = qp.questions.map((locQ, idx) => ({
    id: idx + 1,
    question: locQ.question,
    category: Object.entries(categoryMap).find(([, ids]) => ids.includes(idx + 1))?.[0] ?? "",
    options: locQ.options.map((text, optIdx) => ({
      text,
      score: questionMeta[idx].scores[optIdx] ?? 0,
    })),
    criticalOverride: questionMeta[idx].criticalOverride,
  }));
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
      router.replace("/compliance-scan-v1/company-details");
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
    // generates the PDF server-side using the same jsPDF layout as the admin
    // panel (replaces the previous window.print() screenshot fallback).
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
      return;
    } catch (err) {
      console.error("PDF download failed, falling back to print dialog:", err);
    }
    // Fallback: trigger the browser's print dialog if the API path fails.
    window.print();
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{qp.analysing}</h2>
          <p className="text-slate-500 text-sm">{qp.analysingDesc}</p>
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

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <StepIndicator activeStep={3} />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{qp.resultsHeading}</h1>
            {company && <p className="text-slate-500 text-sm">{company.company}</p>}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{qp.totalScore}</p>
                <p className="text-5xl font-extrabold text-slate-900">
                  {totalScore}
                  <span className="text-xl text-slate-400 font-normal ml-1">{qp.outOf} {maxScore} {qp.points}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{qp.riskLevelLabel}</p>
                <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
              </div>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
              <div className={`h-3 rounded-full transition-all ${cfg.bar}`} style={{ width: `${riskPct}%` }} />
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-1">{cfg.subtitle}</p>
            <p className="text-sm text-slate-500 mb-6">{cfg.description}</p>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{qp.primaryRiskLabel}</span>
              <span className="text-sm font-semibold text-slate-700">{primaryRisk}</span>
            </div>

            {alerts.length > 0 && (
              <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 mb-4`}>
                <ul className="space-y-1">
                  {alerts.map((alert) => (
                    <li key={alert} className="text-sm font-medium text-slate-700">⚠ {alert}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border border-slate-100 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{qp.breakdownTitle}</h3>
              <div className="space-y-2">
                {Object.entries(categoryMap).map(([cat, ids]) => {
                  const catScore = ids.reduce((s, id) => s + (answers[id]?.score ?? 0), 0);
                  const catMax = ids.reduce((s, id) => {
                    const meta = questionMeta.find((qi) => qi.id === id);
                    return s + (meta ? Math.max(...meta.scores) : 0);
                  }, 0);
                  const pct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-40 flex-shrink-0">{cat}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct >= 75 ? "bg-red-500" : pct >= 40 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">{catScore}/{catMax}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">{qp.nextStepsTitle}</h3>
              <ul className="space-y-1.5">
                {cfg.recommendations.map((rec) => (
                  <li key={rec} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-emerald-600 flex-shrink-0">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mb-6 print:hidden">
            {qp.disclaimer}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 print:hidden">
            <Link
              href="/consultation"
              className="flex-1 text-center bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              {qp.bookReview}
            </Link>
            <button
              onClick={handleExportPDF}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <StepIndicator activeStep={2} />

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-slate-900">{qp.heading}</h1>
          <span className="text-sm text-slate-500">{answered}/{questions.length} {qp.answeredLabel}</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 mb-8">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((q, i) => {
            const currentAnswer = answers[q.id];
            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{q.category}</span>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">{q.question}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pl-10">
                  {q.options.map((opt, optIdx) => (
                    <button
                      key={opt.text}
                      onClick={() => handleSelect(q.id, optIdx, opt.score)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${currentAnswer?.optionIndex === optIdx
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link
            href="/compliance-scan-v1/intro"
            className="px-6 py-3 border border-slate-300 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            {qp.back}
          </Link>
          <button
            disabled={!allAnswered}
            onClick={handleSubmit}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {allAnswered ? qp.submitReady : qp.submitWaiting}
          </button>
        </div>
      </div>
    </div>
  );
}
