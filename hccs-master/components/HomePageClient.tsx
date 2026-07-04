"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

const serviceSlugs = [
    "employment-pass",
    "permanent-residence",
    "entrepass",
    "hr-compliance-audit",
    "aihr-retainer",
    "market-entry",
    "fractional-hr",
    "workforce-planning",
    "learning-development",
    "performance-culture",
];

// Corporate clients HCCS has served. Files in /public/logos/.
// Trusted-by tiles: organisations first, then associations. Rendered in a single
// 5-col grid with uniform white tiles — no divider, no separate caption.
const trustLogos: { src: string; alt: string }[] = [
    // Organisations (10)
    { src: "/logos/idemitsu.png",      alt: "Idemitsu" },
    { src: "/logos/sinochem.png",      alt: "Sinochem" },
    { src: "/logos/comfortdelgro.png", alt: "ComfortDelGro" },
    { src: "/logos/vindes.avif",       alt: "VinDes" },
    { src: "/logos/nanshan.jpeg",      alt: "Nanshan" },
    { src: "/logos/siam-chay.webp",    alt: "Siam Chay Medical Institution" },
    { src: "/logos/qss.jpg",           alt: "QSS" },
    { src: "/logos/ren-ci.png",        alt: "Ren Ci" },
    { src: "/logos/guan-chee.png",     alt: "Guan Chee" },
    { src: "/logos/rhs.jpg",           alt: "RHS" },
    // Associations (7)
    { src: "/logos/aspri.png", alt: "ASPRI" },
    { src: "/logos/scal.svg",  alt: "SCAL" },
    { src: "/logos/asme.webp", alt: "ASME" },
    { src: "/logos/sfic.jpg",  alt: "SFIC" },
    { src: "/logos/sfma.png",  alt: "SFMA" },
    { src: "/logos/fmas.webp", alt: "FMAS" },
    { src: "/logos/rcma.webp", alt: "RCMA" },
];

// Portrait images stay constant; copy (name/role/quote) comes from the active locale.
const testimonialImages = [
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/725a43920_generated_image.png",
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/5ae69c846_generated_image.png",
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/a620c78f8_generated_image.png",
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/d18ca897e_generated_image.png",
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/51f439541_generated_image.png",
    "https://media.base44.com/images/public/69c3928519db1fee4acc175a/d18ca897e_generated_image.png",
];

// differentiators + AIHR tiers now come from locale (h.diff, h.aihrTiers)

type MediaItem = {
    id: number;
    title: string | null;
    title_cn?: string | null;
    short_description: string | null;
    short_description_cn?: string | null;
    image: string | null;
    link: string | null;
    display_order?: number | null;
};

export default function HomePageClient({
    mediaItems,
    storageUrl,
}: {
    mediaItems: MediaItem[];
    storageUrl: string;
}) {
    const { t, lang } = useLang();
    const h = t.home;

    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] text-white py-20 sm:py-28 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
                    <div className="absolute -bottom-20 -right-24 h-80 w-80 rounded-full bg-[#2a5a8a]/20 blur-3xl" />
                </div>
                <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
                    <div className="text-center lg:text-left">
                        <p className="inline-flex items-center gap-2 rounded-full border border-[#d4a84b]/40 bg-[#d4a84b]/10 px-3.5 py-1.5 text-[#e8c97a] font-semibold uppercase tracking-[0.2em] text-[11px] mb-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#d4a84b]" />
                            {h.heroPill}
                        </p>
                        {h.heroEaLine && (
                            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-200 max-w-xl mx-auto lg:mx-0 mb-6">
                                {h.heroEaLine}
                            </p>
                        )}
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6">
                            {h.heroTitle}
                        </h1>
                        <p className="text-base sm:text-lg text-slate-200/90 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                            {h.heroDesc}
                        </p>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-7">
                            <Link href="/consultation" className="btn-primary">
                                {h.heroBook}
                                <span aria-hidden>→</span>
                            </Link>
                            <Link href="/compliance-scan-v1" className="btn-on-dark">
                                {h.heroScan}
                            </Link>
                        </div>
                        <p className="text-xs text-slate-300/80 max-w-md mx-auto lg:mx-0">{h.heroMicrocopy}</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#d4a84b]/25 to-[#2a5a8a]/15 blur-xl" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/new_hero.png"
                            alt="HCCS professional HR compliance consultancy team"
                            className="relative w-full rounded-2xl border border-white/15 shadow-2xl shadow-black/50"
                        />
                        <div className="absolute -bottom-4 -left-4 sm:bottom-4 sm:-left-6 rounded-xl border border-[#d4a84b]/30 bg-[#0d1f35]/85 backdrop-blur px-4 py-3 max-w-[230px]">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8c97a]">{h.principalLedEyebrow}</p>
                            <p className="text-sm font-semibold text-white mt-1 leading-snug">{h.principalLedTagline}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats band */}
            <section className="bg-[#0d1f35] text-white py-14 px-4 border-t border-[#d4a84b]/20">
                <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
                    {[
                        { v: "1000+", k: h.statClients },
                        { v: "S$5M+", k: h.statGrants },
                        { v: "25+", k: h.statYears },
                        { v: "100%", k: h.statRate },
                    ].map((s) => (
                        <div key={s.k} className="text-center">
                            <p className="font-display text-3xl sm:text-4xl text-[#d4a84b] leading-none">{s.v}</p>
                            <p className="text-[11px] sm:text-xs text-slate-300 mt-2 uppercase tracking-wider">{s.k}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why HCCS — 3 differentiators */}
            <section className="bg-[#F8F5EC] py-20 sm:py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="eyebrow">{h.whyEyebrow}</p>
                        <h2 className="section-title">{h.whyTitle}</h2>
                        <span className="rule-gold mx-auto mt-4" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {h.diff.map((d, i) => (
                            <article key={d.title} className="card p-7 sm:p-8 bg-white flex flex-col">
                                <div className="flex items-baseline justify-between mb-5">
                                    <span className="font-display text-4xl text-[#d4a84b] leading-none">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#b8902f] font-semibold">{d.proof}</span>
                                </div>
                                <h3 className="font-display text-xl text-[#0d1f35] leading-tight mb-3">{d.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed flex-1">{d.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* AIHR product spotlight */}
            <section className="relative overflow-hidden bg-[#0d1f35] text-white py-20 sm:py-24 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#d4a84b]/8 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#2a5a8a]/15 blur-3xl" />
                </div>
                <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
                    <div>
                        <p className="eyebrow eyebrow-on-dark">{h.aihrEyebrow}</p>
                        <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-4">{h.aihrTitle}</h2>
                        <span className="rule-gold mb-6" />
                        <p className="text-slate-300 leading-relaxed mb-7">{h.aihrBody}</p>
                        <div className="flex flex-wrap gap-3 mb-6">
                            <Link href="/membership" className="btn-primary">
                                {h.aihrCtaPlans}
                                <span aria-hidden>→</span>
                            </Link>
                            <Link href="/member-portal" className="btn-on-dark">
                                {h.aihrCtaStart}
                            </Link>
                        </div>
                        <p className="text-xs text-slate-400">{h.aihrMicrocopy}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {h.aihrTiers.map((tier, i) => (
                            <div
                                key={tier.name}
                                className={`rounded-xl border p-6 transition-colors ${
                                    i === 1
                                        ? "border-[#d4a84b]/55 bg-[#d4a84b]/[0.06]"
                                        : "border-white/10 bg-white/[0.03] hover:border-[#d4a84b]/35"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-display text-xl text-white">{tier.name}</p>
                                    {i === 1 && (
                                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#d4a84b] font-semibold">{h.aihrMostPopular}</span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{tier.line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-20 sm:py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="eyebrow">{h.whatWeDeliver}</p>
                        <h2 className="section-title">{h.servicesTitle}</h2>
                        <span className="rule-gold mx-auto mt-4" />
                        <p className="text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed">{h.servicesDesc}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {h.services.map((service, index) => (
                            <Link
                                key={service.title}
                                href={`/services/${serviceSlugs[index] ?? ""}`}
                                className="group card card-interactive p-6 flex flex-col"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#0d1f35] text-[#d4a84b] font-display text-xs">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <h3 className="font-display text-base text-[#0d1f35] leading-tight group-hover:text-[#1a3a52] transition-colors">
                                        {service.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed flex-1">{service.description}</p>
                                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#b8902f] group-hover:gap-2 transition-all">
                                    {h.servicesLearnMore}
                                    <span aria-hidden>→</span>
                                </p>
                            </Link>
                        ))}
                    </div>
                    <div className="text-center mt-12">
                        <Link href="/services" className="btn-ghost">
                            See all services
                            <span aria-hidden>→</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 sm:py-24 px-4 bg-[#F8F5EC]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="eyebrow">{h.inTheirWords}</p>
                        <h2 className="section-title">{h.testimonialsTitle}</h2>
                        <span className="rule-gold mx-auto mt-4" />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {((t as { testimonials?: Array<{name:string;role:string;quote:string}> }).testimonials ?? []).map((item, idx) => (
                            <figure key={`${item.name}-${item.role}`} className="card p-7 bg-white flex flex-col">
                                <span aria-hidden className="font-display text-5xl text-[#d4a84b] leading-none mb-3">
                                    &ldquo;
                                </span>
                                <blockquote className="text-slate-700 text-sm leading-relaxed flex-1">
                                    {item.quote}
                                </blockquote>
                                <figcaption className="flex items-center gap-3 mt-6 pt-5 border-t border-[#e5e0d2]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={testimonialImages[idx] ?? testimonialImages[0]}
                                        alt={item.name}
                                        className="w-11 h-11 rounded-full object-cover object-top ring-1 ring-[#e5e0d2]"
                                    />
                                    <div>
                                        <p className="font-semibold text-[#0d1f35] text-sm">{item.name}</p>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{item.role}</p>
                                    </div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trusted-by tiles — single uniform white grid, 5 per row on desktop, no divider */}
            <section className="py-14 sm:py-16 bg-[#F8F5EC] border-y border-[#e5e0d2]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-8">
                        {h.trustStripCaption}
                    </p>
                    {/* flex-wrap + fixed basis gives 5/row on md+, 3/row on sm, 2/row on mobile, with the
                        last orphan row centered automatically via justify-center. */}
                    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        {trustLogos.map((logo) => (
                            <li
                                key={logo.src}
                                className="aspect-[5/3] bg-white rounded-xl border border-slate-100 flex items-center justify-center p-2 sm:p-4 hover:border-slate-200 hover:shadow-sm transition-all
                                           basis-[calc(33.333%-8px)] sm:basis-[calc(25%-12px)] md:basis-[calc(20%-13px)]"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={logo.src}
                                    alt={logo.alt}
                                    loading="lazy"
                                    className="max-h-[44px] sm:max-h-[64px] md:max-h-[80px] max-w-[92%] w-auto h-auto object-contain"
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Insights — full media wall as social proof */}
            {mediaItems.length > 0 && (
                <section className="py-20 sm:py-24 px-4 bg-[#F8F5EC] border-y border-[#e5e0d2]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="eyebrow">{h.fieldNotesEyebrow}</p>
                            <h2 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight">
                                {h.insightsTitle}
                            </h2>
                            <span className="rule-gold mx-auto mt-4" />
                            <p className="text-slate-600 max-w-2xl mx-auto mt-5 leading-relaxed">{h.insightsDesc}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 items-start">
                            {mediaItems.map((item, i) => {
                                const isYouTube = (item.link ?? "").includes("youtu");
                                const displayTitle = (lang === "zh" ? item.title_cn ?? item.title : item.title ?? item.title_cn) ?? "";
                                const displayDesc = lang === "zh" ? item.short_description_cn ?? item.short_description : item.short_description ?? item.short_description_cn;
                                return (
                                <a
                                    key={item.id}
                                    href={item.link ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`group card card-interactive p-0 overflow-hidden flex flex-col bg-white ${isYouTube ? "col-span-2" : ""}`}
                                >
                                    <div className={`relative ${isYouTube ? "aspect-video" : "aspect-[9/16]"} overflow-hidden bg-[#0d1f35]`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={(item.image ?? "").startsWith("http") ? item.image! : `${storageUrl}${item.image}`}
                                            alt={displayTitle || `Video ${i + 1}`}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                        />
                                        {/* Gradient overlay so title reads on top of image */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f35]/80 via-[#0d1f35]/10 to-transparent pointer-events-none" />
                                        {/* Play indicator */}
                                        <span className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur text-[#0d1f35] shadow-md transition-transform group-hover:scale-110">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                                        </span>
                                        {/* Title overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <h3 className="font-display text-lg text-white leading-snug mb-1 drop-shadow">
                                                {displayTitle}
                                            </h3>
                                            {displayDesc && (
                                                <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                                                    {displayDesc}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between gap-3 border-t border-[#e5e0d2]">
                                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                                            {(item.link ?? "").includes("youtu") ? "YouTube" : "TikTok"}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b8902f] group-hover:gap-2 transition-all">
                                            {h.watchCta}
                                            <span aria-hidden>→</span>
                                        </span>
                                    </div>
                                </a>
                                );
                            })}
                        </div>
                        <div className="text-center mt-12">
                            <a
                                href="https://www.tiktok.com/@askbeebeesghr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-navy"
                            >
                                {h.insightsFollow}
                                <span aria-hidden>→</span>
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA — single primary action */}
            <section className="py-20 sm:py-24 px-4 bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] text-white relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-[#d4a84b]/12 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#2a5a8a]/20 blur-3xl" />
                </div>
                <div className="relative max-w-3xl mx-auto text-center">
                    <p className="eyebrow eyebrow-on-dark">{h.nextStepEyebrow}</p>
                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight mb-5">{h.ctaFinalTitle}</h2>
                    <span className="rule-gold mx-auto mb-6" />
                    <p className="text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">{h.ctaFinalBody}</p>
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        <Link href="/consultation" className="btn-primary">
                            {h.ctaFinalBook}
                            <span aria-hidden>→</span>
                        </Link>
                        <a
                            href="https://wa.me/6594362866"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-on-dark"
                        >
                            {h.ctaFinalWhatsapp}
                        </a>
                    </div>
                    <p className="text-xs text-slate-400">
                        {h.ctaFinalScanPre}
                        <Link
                            href="/compliance-scan-v1"
                            className="text-[#e8c97a] hover:text-white underline underline-offset-2 font-medium"
                        >
                            {h.ctaFinalScanLink}
                        </Link>
                        {h.ctaFinalScanPost}
                    </p>
                </div>
            </section>

            {/* Fixed buttons */}
            <div className="fixed bottom-20 right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
                <Link href="/try-aihr" className="hover:scale-105 transition-transform" title="Try AIHR">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/try-aihr-trigger.png"
                        alt="Try AIHR"
                        className="w-28 sm:w-40 md:w-52 h-auto object-contain drop-shadow-2xl"
                    />
                </Link>
                <a
                    href="https://wa.me/6594362866"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1da851] text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold inline-flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {t.footer.whatsapp}
                </a>
            </div>
        </div>
    );
}
