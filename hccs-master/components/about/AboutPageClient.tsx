"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n";

const visionIcons = ["award", "users", "heart"] as const;

const advisorImages: Record<string, string> = {
    jennifer: "https://media.base44.com/images/public/69c3928519db1fee4acc175a/33f86d437_ChatGPTImageMar29202611_35_20PM.png",
    loh:      "https://media.base44.com/images/public/69c3928519db1fee4acc175a/6d7919aa9_ChatGPTImageMar29202611_36_09PM.png",
    ung:      "https://media.base44.com/images/public/69c3928519db1fee4acc175a/78b8364a5_ChatGPTImageMar29202611_37_48PM.png",
    james:    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/f8e857df6_7f7de04b-eaa8-4ce6-8492-286a5ee3e53a.png",
};
const florenceImage = "https://osqmfupzcqlorsayiulk.supabase.co/storage/v1/object/public/images/people/florence-2026.jpeg";

type ProfileSection = { heading: string; items: string[] };
type Profile = {
    title: string;
    role: string;
    intro: string;
    stats?: Array<{ label: string; value: string }>;
    sections: ProfileSection[];
};

export default function AboutPageClient() {
    const { t, lang } = useLang();
    const a = t.about;
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const profiles = (a as { profiles?: Record<string, Profile> }).profiles ?? {};
    const activeProfile = activeProfileId ? profiles[activeProfileId] : null;
    const profileImage = activeProfileId === "florence" ? florenceImage : (advisorImages[activeProfileId ?? ""] ?? florenceImage);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setActiveProfileId(null);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const values = (a as { values?: Array<{ number: string; title: string; description: string; tags: string[] }> }).values ?? [];
    const advisors = (a as { advisors?: Array<{ id: string; name: string; role: string; bio: string }> }).advisors ?? [];

    return (
        <main className="min-h-screen bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] text-white py-20 sm:py-24 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#2a5a8a]/20 blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto text-center">
                    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mb-5 leading-[1.05]">{a.heroTitle}</h1>
                    <span className="rule-gold mx-auto mb-6" />
                    <p className="text-slate-200 text-lg max-w-2xl mx-auto leading-relaxed">{a.heroDesc}</p>
                </div>
            </section>

            {/* Vision / Mission / Belief */}
            <section className="py-20 px-4 bg-[#F8F5EC]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        {a.visionMissionBelief.map((item, index) => (
                            <div key={index} className="card p-8 bg-white">
                                <div className="w-12 h-12 rounded-xl bg-[#1a3a52]/5 border border-[#1a3a52]/15 flex items-center justify-center mb-5">
                                    {visionIcons[index] === "award" && (
                                        <svg className="w-6 h-6 text-[#1a3a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 12 2 2 4-4m7.773-4.355A10 10 0 1 1 2.227 10.645" />
                                        </svg>
                                    )}
                                    {visionIcons[index] === "users" && (
                                        <svg className="w-6 h-6 text-[#1a3a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 1 1 0 8.048M9 11H3v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8h-6m0-1v1m0 0a4 4 0 1 1 8 0m-4-4v4" />
                                        </svg>
                                    )}
                                    {visionIcons[index] === "heart" && (
                                        <svg className="w-6 h-6 text-[#1a3a52]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                        </svg>
                                    )}
                                </div>
                                <h3 className="font-display text-xl text-[#0d1f35] mb-3 leading-tight">{item.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Principal block */}
            <section className="py-20 sm:py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="relative">
                            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#d4a84b]/25 to-[#2a5a8a]/15 blur-xl" />
                            <div className="relative rounded-2xl overflow-hidden shadow-[0_24px_60px_-32px_rgba(13,31,53,0.30)] border border-[#e5e0d2]">
                                <Image
                                    src={florenceImage}
                                    alt={`${(a as { principalName?: string }).principalName ?? (lang === "zh" ? "郭家语" : "Ker Bee Bee")}, ${(a as { principalEyebrow?: string }).principalEyebrow ?? "Founder & Principal Consultant"}`}
                                    width={500}
                                    height={600}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <div className="card px-5 py-3 text-center flex-1">
                                    <p className="font-display text-2xl text-[#0d1f35] leading-none">25+</p>
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mt-1.5">{(a as { yearsExpLabel?: string }).yearsExpLabel}</p>
                                </div>
                                <div className="card px-5 py-3 text-center flex-1">
                                    <p className="font-display text-2xl text-[#0d1f35] leading-none">500+</p>
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mt-1.5">{(a as { smesLabel?: string }).smesLabel}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="eyebrow">{(a as { principalEyebrow?: string }).principalEyebrow}</p>
                            <h2 className="font-display text-4xl text-[#0d1f35] leading-tight mb-4">{(a as { principalName?: string }).principalName}</h2>
                            <span className="rule-gold mb-5" />
                            <p className="text-slate-600 leading-relaxed mb-6">
                                {(a as { principalBio?: string }).principalBio}
                            </p>
                            <div className="space-y-2 mb-6">
                                {((a as { principalServices?: string[] }).principalServices ?? []).map((item) => (
                                    <div key={item} className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-[#d4a84b] rounded-full" />
                                        <span className="text-sm text-slate-700">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <blockquote className="font-display text-lg text-[#0d1f35] italic leading-snug border-l-2 border-[#d4a84b] pl-5 my-6">
                                {(a as { principalQuote?: string }).principalQuote}
                            </blockquote>
                            <button
                                type="button"
                                onClick={() => setActiveProfileId("florence")}
                                className="btn-primary"
                                suppressHydrationWarning
                            >
                                {a.readProfile}
                                <span aria-hidden>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 sm:py-24 px-4 bg-[#F8F5EC]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="eyebrow">{(a as { valuesEyebrow?: string }).valuesEyebrow}</p>
                        <h2 className="section-title">{a.valuesTitle}</h2>
                        <span className="rule-gold mx-auto mt-4" />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {values.map((value) => (
                            <div key={value.number} className="card p-7 bg-white flex flex-col">
                                <div className="flex items-baseline justify-between mb-4">
                                    <span className="font-display text-3xl text-[#d4a84b] leading-none">{value.number}</span>
                                </div>
                                <h3 className="font-display text-lg text-[#0d1f35] mb-3 leading-tight">{value.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{value.description}</p>
                                <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-[#e5e0d2]">
                                    {value.tags.map((tag) => (
                                        <span key={tag} className="text-[10px] uppercase tracking-[0.14em] text-[#1a3a52] bg-[#1a3a52]/5 border border-[#1a3a52]/15 rounded-md px-2 py-1">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Advisors */}
            <section className="relative overflow-hidden py-20 sm:py-24 px-4 bg-[#0d1f35] text-white">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#d4a84b]/10 blur-3xl" />
                </div>
                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="eyebrow eyebrow-on-dark">{(a as { advisorsEyebrow?: string }).advisorsEyebrow}</p>
                        <h2 className="font-display text-3xl sm:text-4xl text-white leading-tight">{a.advisorsTitle}</h2>
                        <span className="rule-gold mx-auto mt-4" />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {advisors.map((advisor) => (
                            <div key={advisor.id} className="rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#d4a84b]/45 transition-colors p-6 flex flex-col items-center text-center">
                                <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-[#d4a84b]/55 mb-4">
                                    <Image
                                        src={advisorImages[advisor.id] ?? florenceImage}
                                        alt={advisor.name}
                                        width={112}
                                        height={112}
                                        className="w-full h-full object-cover object-top"
                                    />
                                </div>
                                <h3 className="font-display text-base text-white">{advisor.name}</h3>
                                <p className="text-[#e8c97a] text-[10px] font-semibold uppercase tracking-[0.16em] mt-1.5 mb-3 leading-tight">{advisor.role}</p>
                                <p className="text-slate-300 text-xs leading-relaxed">{advisor.bio}</p>
                                <button
                                    type="button"
                                    onClick={() => setActiveProfileId(advisor.id)}
                                    className="mt-5 text-xs font-semibold text-[#d4a84b] hover:text-white transition-colors inline-flex items-center gap-1.5"
                                    suppressHydrationWarning
                                >
                                    {a.readProfile}
                                    <span aria-hidden>→</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-[#F8F5EC]">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="eyebrow">{(a as { ctaEyebrow?: string }).ctaEyebrow}</p>
                    <h2 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight mb-3">{t.common.bookFreeConsultation}</h2>
                    <span className="rule-gold mx-auto mb-5" />
                    <p className="text-slate-600 mb-8 leading-relaxed">{(a as { ctaSubheading?: string }).ctaSubheading}</p>
                    <Link href="/consultation" className="btn-primary">
                        {t.common.bookFreeConsultation}
                        <span aria-hidden>→</span>
                    </Link>
                </div>
            </section>

            {/* Profile modal */}
            {activeProfile ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        onClick={() => setActiveProfileId(null)}
                        className="absolute inset-0 bg-[#0a1628]/70 backdrop-blur-sm"
                        aria-label={(a as { closeLabel?: string }).closeLabel ?? "Close"}
                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-[#0d1f35] px-5 sm:px-8 pt-6 pb-5 relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setActiveProfileId(null)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                                aria-label={(a as { closeLabel?: string }).closeLabel ?? "Close"}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>

                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#d4a84b]/60 shrink-0">
                                    <Image src={profileImage} alt={activeProfile.title} width={64} height={64} className="w-full h-full object-cover object-top" />
                                </div>
                                <div>
                                    <h3 className="font-display text-2xl sm:text-3xl text-white mb-1 leading-tight">{activeProfile.title}</h3>
                                    <p className="text-[#e8c97a] text-sm font-semibold mb-2">{activeProfile.role}</p>
                                    <p className="text-slate-300 text-sm leading-relaxed">{activeProfile.intro}</p>
                                </div>
                            </div>

                            {activeProfile.stats?.length ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/15">
                                    {activeProfile.stats.map((item) => (
                                        <div key={item.label} className="text-center">
                                            <p className="font-display text-[#d4a84b] text-lg leading-none">{item.value}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-300 mt-1.5">{item.label}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="overflow-y-auto p-5 sm:p-8">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h4 className="font-display text-base text-[#0d1f35] mb-3">{activeProfile.sections[0]?.heading}</h4>
                                    <ul className="space-y-2">
                                        {(activeProfile.sections[0]?.items ?? []).map((item) => (
                                            <li key={item} className="text-sm text-slate-700 leading-relaxed flex items-start gap-2">
                                                <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-6">
                                    {activeProfile.sections.slice(1).map((section) => (
                                        <div key={section.heading}>
                                            <h4 className="font-display text-base text-[#0d1f35] mb-3">{section.heading}</h4>
                                            <ul className="space-y-2">
                                                {section.items.map((item) => (
                                                    <li key={item} className="text-sm text-slate-700 leading-relaxed flex items-start gap-2">
                                                        <span className="mt-1.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
