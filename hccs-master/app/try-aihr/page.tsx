"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import AIHRChat from "@/components/AIHRChat";
import { useLang } from "@/lib/i18n";

type Tier = "Free" | "Essential" | "Professional" | "Strategic";

interface LiveCard {
    kind: "live";
    id: Tier;
    badge?: string;
    headerAccent: string;
    pillsTextColor: string;
    title: string;
    tagline: string;
    trialLimit: number;
    ctaLabel: string;
    ctaHref: string;
}

interface LockedCard {
    kind: "locked";
    id: Tier;
    icon: string;
    title: string;
    /** Available-now tagline shown under the title; empty string hides it. */
    tagline: string;
    /** Annual price label, e.g. "S$11,988 /yr". */
    price: string;
    /** Feature bullets — mirrors /membership locale for the same plan. */
    features: string[];
    ctaLabel: string;
    ctaHref: string;
}

type TierCardConfig = LiveCard | LockedCard;

const TIERS: TierCardConfig[] = [
    {
        kind: "live",
        id: "Free",
        badge: "Try 10 free",
        headerAccent: "from-slate-700/30 to-slate-600/20",
        pillsTextColor: "text-emerald-300",
        title: "AIHR Free",
        tagline: "Strict FAQ answers · sign up for the full Free plan (50/week)",
        trialLimit: 10,
        ctaLabel: "Sign Up — Free Plan",
        ctaHref: "/register",
    },
    {
        kind: "live",
        id: "Essential",
        badge: "Try 5 free",
        headerAccent: "from-emerald-700/40 to-emerald-600/20",
        pillsTextColor: "text-emerald-300",
        title: "AIHR Essential",
        tagline: "Detailed write-ups · formulas · comparisons",
        trialLimit: 5,
        ctaLabel: "Subscribe to AIHR Essential",
        ctaHref: "/membership",
    },
    {
        kind: "locked",
        id: "Professional",
        icon: "💼",
        title: "AIHR Professional",
        tagline: "Growing businesses",
        price: "S$11,988 /yr",
        // Mirrors /membership locale (en) for the Professional plan.
        features: [
            "Everything in Essential",
            "AIHR Pro+ chatbot — advanced responses & knowledge base",
            "Full premium resource vault",
            "Free AI alert on government legislation changes to your email",
            "Higher consultation priority (above Essential)",
            "25% off Virtual Classroom classes",
            "2 HR audits / compliance reviews per year",
            "Premium templates, SOPs & policy packs",
        ],
        ctaLabel: "Subscribe to AIHR Professional",
        ctaHref: "/membership",
    },
    {
        kind: "locked",
        id: "Strategic",
        icon: "👑",
        title: "AIHR Strategic",
        tagline: "Enterprise HR teams",
        price: "S$17,988 /yr",
        // Mirrors /membership locale (en) for the Strategic plan.
        features: [
            "Everything in Professional",
            "AIHR Strategic chatbot — widest knowledge base, best performance",
            "Full access to all resources & premium tools",
            "Free AI alert on government legislation changes to your email",
            "Highest consultation priority (fastest response)",
            "35% off Virtual Classroom classes",
            "HR Compliance Audit every 6 months",
            "Team / organisation access (multi-user portal)",
            "Dedicated onboarding & activation session",
        ],
        ctaLabel: "Subscribe to AIHR Strategic",
        ctaHref: "/membership",
    },
];

export default function TryAIHRPage() {
    const { lang } = useLang();
    const liveTiers = TIERS.filter((t): t is LiveCard => t.kind === "live");
    const [tokens, setTokens] = useState<Partial<Record<Tier, string>>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const results = await Promise.all(
                    liveTiers.map(async (t) => {
                        const res = await fetch("/api/security/demo-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tier: t.id }),
                        });
                        if (!res.ok) throw new Error(`${t.id}: ${res.status}`);
                        const data = (await res.json()) as { token: string };
                        return [t.id, data.token] as const;
                    }),
                );
                if (!cancelled) {
                    const obj: Partial<Record<Tier, string>> = {};
                    for (const [tier, token] of results) obj[tier] = token;
                    setTokens(obj);
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to initialise demo");
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0d1f35] via-[#0a1828] to-[#080f1d] text-white">
            <section className="max-w-[1600px] mx-auto px-4 md:px-6 pt-12 pb-10">
                {/* Header */}
                <div className="text-center mb-10 md:mb-14">
                    <h1 className="font-display text-3xl md:text-5xl leading-tight mb-4">
                        {lang === "zh" ? "体验 AIHR —— 您的 AI 智能人力资源助手" : "Try AIHR — Your AI-Powered HR Assistant"}
                    </h1>
                    <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto">
                        Chat live on Free and Essential. See what Professional and Strategic include below — every plan is
                        available now.
                    </p>
                </div>

                {error && (
                    <div className="max-w-3xl mx-auto mb-6 rounded-lg bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3">
                        Demo unavailable: {error}
                    </div>
                )}

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
                    {TIERS.map((t) => {
                        if (t.kind === "locked") {
                            return (
                                <div
                                    key={t.id}
                                    className="relative flex flex-col rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-6 min-h-[640px] md:min-h-[680px]"
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-[#d4a84b]/15 border border-[#d4a84b]/40 flex items-center justify-center text-2xl flex-shrink-0">
                                            {t.icon}
                                        </div>
                                        <div className="leading-tight">
                                            <h3 className="font-display text-xl md:text-2xl">{t.title}</h3>
                                            {t.tagline && (
                                                <p className="text-xs md:text-sm text-slate-300 mt-1">{t.tagline}</p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-white text-xl md:text-2xl font-display mb-5">
                                        {t.price}
                                    </p>
                                    <ul className="space-y-2 mb-6 flex-1">
                                        {t.features.map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-slate-200 leading-snug">
                                                <span className="text-[#d4a84b] mt-0.5 flex-shrink-0">✓</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={t.ctaHref}
                                        className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#d4a84b] text-[#0d1f35] font-semibold text-sm py-3 hover:bg-[#b8902f] hover:text-white transition-colors"
                                    >
                                        {t.ctaLabel}
                                        <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={t.id}
                                className="relative flex flex-col rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                            >
                                {t.badge && (
                                    <div className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full border border-[#d4a84b]/60 bg-[#d4a84b]/15 text-[#e8c97a] text-[10px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1">
                                        {t.badge}
                                    </div>
                                )}

                                <div className={`px-5 pt-5 pb-3 bg-gradient-to-br ${t.headerAccent}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`h-2 w-2 rounded-full bg-current ${t.pillsTextColor} animate-pulse`} />
                                        <p className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${t.pillsTextColor}`}>
                                            Live
                                        </p>
                                    </div>
                                    <h3 className="font-display text-xl md:text-2xl">{t.title}</h3>
                                    <p className="text-xs md:text-sm text-slate-300 mt-1 leading-snug">{t.tagline}</p>
                                </div>

                                <div className="px-3 pb-3 flex-1 flex flex-col">
                                    <div className="flex-1 min-h-[520px] md:min-h-[560px] rounded-2xl overflow-hidden border border-white/10 bg-[#F8F5EC]">
                                        {tokens[t.id] ? (
                                            <AIHRChat
                                                compact
                                                demoToken={tokens[t.id]!}
                                                demoTier={t.id}
                                                trialMessageLimit={t.trialLimit}
                                                upgradeHref={t.ctaHref}
                                                key={tokens[t.id]}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-slate-500">
                                                Initialising…
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        href={t.ctaHref}
                                        className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#d4a84b] text-[#0d1f35] font-semibold text-sm py-3 hover:bg-[#b8902f] hover:text-white transition-colors"
                                    >
                                        {t.ctaLabel}
                                        <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="mt-10 md:mt-14 text-center">
                    <p className="text-sm text-slate-400 mb-4">Already a member? Open the full experience with chat history.</p>
                    <Link
                        href="/member-portal"
                        className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#d4a84b] to-[#e8c97a] text-[#0d1f35] font-bold text-base md:text-lg px-8 md:px-12 py-3.5 md:py-4 transition-transform hover:scale-[1.02] shadow-2xl shadow-[#d4a84b]/30"
                    >
                        Go to Member Portal
                        <span aria-hidden>→</span>
                    </Link>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-[11px] text-slate-500 mt-10 max-w-2xl mx-auto leading-relaxed">
                    AIHR provides general HR compliance guidance only — not legal advice. For tailored advice, consult the HCCS
                    team. The free preview is anonymous and resets per browser session.
                </p>
            </section>
        </main>
    );
}
