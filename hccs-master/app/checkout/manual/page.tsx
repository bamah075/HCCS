"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PAYNOW_DETAILS } from "@/lib/payments/manual";

const PLANS: Record<number, { label: string; amount: number; descriptor: string }> = {
    1: { label: "Essential — Monthly", amount: 599, descriptor: "Essential Monthly" },
    2: { label: "Essential — Annual", amount: 5988, descriptor: "Essential Annual" },
    3: { label: "Professional — Monthly", amount: 999, descriptor: "Professional Monthly" },
    4: { label: "Professional — Annual", amount: 11988, descriptor: "Professional Annual" },
    5: { label: "Strategic — Monthly", amount: 1499, descriptor: "Strategic Monthly" },
    6: { label: "Strategic — Annual", amount: 17988, descriptor: "Strategic Annual" },
    7: { label: "Essential Bundle (3-Month Intro)", amount: 997, descriptor: "Essential Bundle" },
    8: { label: "Expert Advisory (one-time)", amount: 1500, descriptor: "Expert Advisory" },
};

function fmtSgd(amount: number) {
    return `S$${amount.toLocaleString("en-SG")}`;
}

function ManualCheckoutInner() {
    const params = useSearchParams();
    const planIdRaw = Number(params.get("planId") || "");
    const initialPlanId = PLANS[planIdRaw] ? planIdRaw : 0;
    const [planId, setPlanId] = useState<number>(initialPlanId);
    const [declaredEmail, setDeclaredEmail] = useState("");
    const [reference, setReference] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [authedEmail, setAuthedEmail] = useState<string | null>(null);
    const [result, setResult] = useState<{ ok: boolean; message: string; manualPaymentId?: number } | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const email = data.session?.user?.email ?? null;
            setAuthedEmail(email);
            if (email && !declaredEmail) setDeclaredEmail(email);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const plan = useMemo(() => PLANS[planId] ?? null, [planId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planId || !plan) {
            setResult({ ok: false, message: "Please pick a plan first." });
            return;
        }
        setSubmitting(true);
        setResult(null);
        try {
            const { data: sess } = await supabase.auth.getSession();
            const token = sess.session?.access_token;
            if (!token) {
                setResult({ ok: false, message: "Please sign in to submit your payment declaration." });
                setSubmitting(false);
                return;
            }
            const res = await fetch("/api/checkout/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ planId, declaredEmail, reference, note }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setResult({ ok: false, message: data.error || "Could not submit. Please contact " + PAYNOW_DETAILS.enquiryEmail });
            } else {
                setResult({ ok: true, message: data.nextSteps, manualPaymentId: data.manualPaymentId });
            }
        } catch (err) {
            setResult({ ok: false, message: (err as Error).message });
        } finally {
            setSubmitting(false);
        }
    };

    if (result?.ok) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <div className="rounded-2xl bg-white border border-[#e5e0d2] p-10 shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#1a3a52] font-semibold">Declaration received</p>
                    <h1 className="font-display text-3xl text-[#0d1f35] mt-3 mb-2">Thanks — we&apos;re on it.</h1>
                    <span className="rule-gold mx-auto mb-6 block" />
                    <p className="text-slate-700 leading-relaxed mb-3">
                        Reference <strong>#{result.manualPaymentId}</strong>. Our team will reconcile your
                        transfer with the bank statement and activate your subscription, usually within
                        one (1) business day.
                    </p>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        We&apos;ve sent a confirmation to your email. If you have any questions, write to{" "}
                        <a className="text-[#b8902f] font-semibold" href={`mailto:${PAYNOW_DETAILS.enquiryEmail}`}>
                            {PAYNOW_DETAILS.enquiryEmail}
                        </a>.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/member-portal" className="btn-primary">Go to member portal</Link>
                        <Link href="/" className="btn-ghost">Back to home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="mb-6 text-center">
                <p className="eyebrow">PayNow checkout</p>
                <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] mt-2">
                    Pay by PayNow, then declare your transfer
                </h1>
                <span className="rule-gold mx-auto mt-4 mb-2 block" />
                <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Use the QR below to pay via your bank app, then submit the declaration form. Our team
                    verifies and activates your subscription within one (1) business day.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* PayNow QR */}
                <div className="rounded-2xl bg-white border border-[#e5e0d2] p-7 shadow-[0_18px_50px_-30px_rgba(13,31,53,0.18)]">
                    <h2 className="font-display text-xl text-[#0d1f35] mb-1">Step 1 — Pay</h2>
                    <p className="text-sm text-slate-600 mb-5">Scan this QR with PayNow / DBS / OCBC / UOB / any SG banking app.</p>
                    <div className="bg-[#F8F5EC] rounded-xl p-4 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={PAYNOW_DETAILS.qrUrl}
                            alt="HCCS PayNow QR"
                            className="w-full max-w-[280px] h-auto"
                        />
                    </div>
                    <dl className="mt-5 text-sm text-slate-700 space-y-2">
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Payee</dt>
                            <dd className="text-right font-medium">{PAYNOW_DETAILS.payeeName}</dd>
                        </div>
                        {plan && (
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Amount</dt>
                                <dd className="text-right font-semibold text-[#0d1f35]">{fmtSgd(plan.amount)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Reference (in bank app)</dt>
                            <dd className="text-right font-mono text-xs">{PAYNOW_DETAILS.referenceHint}</dd>
                        </div>
                    </dl>
                    <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                        Tip — put the email you registered with into the bank-app &ldquo;reference&rdquo; field
                        so we can match the transfer instantly.
                    </p>
                </div>

                {/* Declaration form */}
                <form onSubmit={handleSubmit}
                    className="rounded-2xl bg-white border border-[#e5e0d2] p-7 shadow-[0_18px_50px_-30px_rgba(13,31,53,0.18)] space-y-4">
                    <h2 className="font-display text-xl text-[#0d1f35] mb-1">Step 2 — Declare</h2>
                    <p className="text-sm text-slate-600 mb-3">After you&apos;ve paid, tell us so we can activate your plan.</p>

                    {!authedEmail && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">
                            Please <Link href="/auth/sign-in" className="underline font-semibold">sign in</Link> first.
                            Manual declarations are tied to your HCCS account.
                        </div>
                    )}

                    <label className="block">
                        <span className="text-sm font-semibold text-[#0d1f35]">Plan</span>
                        <select
                            value={planId}
                            onChange={(e) => setPlanId(Number(e.target.value))}
                            className="mt-1 w-full rounded-md border border-[#e5e0d2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                            required
                        >
                            <option value={0}>— Select a plan —</option>
                            {Object.entries(PLANS).map(([id, p]) => (
                                <option key={id} value={id}>{p.label} · {fmtSgd(p.amount)}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#0d1f35]">Email for confirmation</span>
                        <input
                            type="email" value={declaredEmail} onChange={(e) => setDeclaredEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="mt-1 w-full rounded-md border border-[#e5e0d2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                            required
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#0d1f35]">Bank reference number (optional)</span>
                        <input
                            type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. PayNow ref / FAST ref"
                            className="mt-1 w-full rounded-md border border-[#e5e0d2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-[#0d1f35]">Note for HCCS (optional)</span>
                        <textarea
                            value={note} onChange={(e) => setNote(e.target.value)}
                            placeholder="Anything we should know? E.g. paying for a colleague, transferring from a different bank, etc."
                            rows={3}
                            className="mt-1 w-full rounded-md border border-[#e5e0d2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                        />
                    </label>

                    {result && !result.ok && (
                        <div className="rounded-md bg-red-50 border border-red-200 text-red-900 text-sm p-3">
                            {result.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !authedEmail}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Submitting..." : "Submit declaration"}
                    </button>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        We&apos;ll match your declaration against the bank statement before activating your
                        plan. If we can&apos;t verify within 1 business day we&apos;ll email you. Questions —{" "}
                        <a className="text-[#b8902f] font-semibold" href={`mailto:${PAYNOW_DETAILS.enquiryEmail}`}>
                            {PAYNOW_DETAILS.enquiryEmail}
                        </a>.
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function ManualCheckoutPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading…</div>}>
            <ManualCheckoutInner />
        </Suspense>
    );
}
