"use client";

import { useEffect, useState } from "react";
import AIHRChat from "@/components/AIHRChat";

type Tier = "Free" | "Essential" | "Professional" | "Strategic";

const TIERS: { id: Tier; label: string; blurb: string; color: string }[] = [
    {
        id: "Free",
        label: "Free",
        blurb: "FAQ snippets only. Hard 40-word cap, refuses scenarios + calculations + drafting. Built to feel visibly insufficient — by design.",
        color: "bg-slate-700",
    },
    {
        id: "Essential",
        label: "Essential",
        blurb: "Structured write-ups with comparison tables, watch-outs, and quoted formulas (“17% × OW”). Never multiplies out to a final $ value — that’s Professional’s job.",
        color: "bg-emerald-700",
    },
    {
        id: "Professional",
        label: "Professional",
        blurb: "Live calculations + at least one multi-step edge case (OW ceiling, age-band, AW bonus, proration). Drafts contracts / letters / policies. Cites statutes. Always deeper than Essential.",
        color: "bg-blue-700",
    },
    {
        id: "Strategic",
        label: "Strategic",
        blurb: "Always adds ≥2 strategic frames (cross-border, M&A, regulator engagement, company-wide policy). Anti-duplication rule: never repeats a Professional answer. Closes with retained-advisory positioning.",
        color: "bg-purple-700",
    },
];

export default function PrivateChatbotTestPage() {
    const [tier, setTier] = useState<Tier>("Free");
    const [demoToken, setDemoToken] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const active = TIERS.find((t) => t.id === tier)!;

    // Fetch a new short-lived demo session token whenever the tier changes.
    useEffect(() => {
        let cancelled = false;
        setDemoToken(null);
        setTokenError(null);
        (async () => {
            try {
                const res = await fetch("/api/security/demo-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier }),
                });
                if (!res.ok) {
                    const txt = await res.text();
                    if (!cancelled) setTokenError(txt || `Failed to obtain demo session (${res.status}).`);
                    return;
                }
                const data = (await res.json()) as { token: string };
                if (!cancelled) setDemoToken(data.token);
            } catch (e) {
                if (!cancelled) setTokenError(e instanceof Error ? e.message : "Failed to obtain demo session.");
            }
        })();
        return () => { cancelled = true; };
    }, [tier]);

    return (
        <div className="min-h-screen bg-[#F8F5EC] py-4 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-0.5">AIHR · Internal Testing · KB v10</p>
                    <h1 className="text-lg sm:text-xl font-bold text-[#0d1f35]">Side-by-side tier comparison sandbox</h1>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Same question, four different behaviours by design. Toggle a tier above and try the prompts inside —
                        or ask anything. Voice playback on every reply (🔊 Listen). Mic input for voice questions (🎤).
                        Auto-detects Chinese. Anonymous · unlimited · no signup · no quota counting.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {TIERS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTier(t.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                                tier === t.id
                                    ? `${t.color} text-white border-transparent shadow-sm`
                                    : "bg-white text-[#0d1f35] border-[#e5e0d2] hover:border-[#d4a84b]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <p className="text-[11px] text-slate-600 mb-2 bg-white border border-[#e5e0d2] rounded-lg px-3 py-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${active.color} mr-2 align-middle`} />
                    <span className="font-semibold text-[#0d1f35]">{active.label}:</span> {active.blurb}
                </p>

                <div className="h-[min(75vh,640px)] min-h-[400px] bg-white border border-[#e5e0d2] rounded-2xl overflow-hidden shadow-sm">
                    {tokenError && (
                        <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
                            Demo session unavailable: {tokenError}
                        </div>
                    )}
                    {!tokenError && !demoToken && (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">
                            Initialising session…
                        </div>
                    )}
                    {demoToken && (
                        <AIHRChat compact demoToken={demoToken} demoTier={tier} key={`${tier}-${demoToken}`} />
                    )}
                </div>

                <div className="mt-4 text-center space-y-1">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Internal · unlimited · usage does not count against any user&apos;s weekly quota. Public-facing
                        version (with 5-message trials on Essential / Professional / Strategic) is at{" "}
                        <a href="/try-aihr" className="underline hover:text-[#0d1f35]">/try-aihr</a>.
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Coverage: Employment Contracts · Payroll · CPF · Working Hours / OT · Leave · PR · Termination ·
                        TAFEP fair hiring · Workplace Fairness Act 2025 · EP / S Pass / WP (COMPASS, DRC) · MOM Audit.
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Bot will refuse to enumerate internal documents · all answers route through the AI services gateway.
                    </p>
                </div>
            </div>
        </div>
    );
}
