"use client";

import { useLang } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type NewsRow = {
    id: number;
    title: string | null;
    title_cn: string | null;
    body: string | null;
    body_cn: string | null;
    url: string | null;
    agency_name: string | null;
    content_type: string | null;
    hero_image: string | null;
    published_at: string | null;
};

function hostnameOf(url: string | null): string {
    if (!url) return "";
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function formatDate(iso: string | null, lang: "en" | "zh"): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const locale = lang === "zh" ? "zh-SG" : "en-SG";
        return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

// Simple per-agency colour swatches for the featured-card placeholder when no hero_image.
function agencySwatch(agency: string | null): { from: string; to: string; mono: string } {
    const a = (agency ?? "").toLowerCase();
    if (a.includes("manpower") || a.includes("mom")) return { from: "#1a3a52", to: "#0d1f35", mono: "MOM" };
    if (a.includes("cpf")) return { from: "#0f3a5f", to: "#072036", mono: "CPF" };
    if (a.includes("tafep")) return { from: "#2a5a8a", to: "#1a3a52", mono: "TAFEP" };
    if (a.includes("agc") || a.includes("statutes")) return { from: "#3b2a18", to: "#1a1208", mono: "AGC" };
    if (a.includes("straits times")) return { from: "#0d1f35", to: "#0a1628", mono: "ST" };
    if (a.includes("zaobao") || a.includes("早报")) return { from: "#5a1e1e", to: "#2a0f0f", mono: "ZB" };
    if (a.includes("business times")) return { from: "#0d1f35", to: "#0a1628", mono: "BT" };
    if (a.includes("today")) return { from: "#1a3a52", to: "#0d1f35", mono: "TODAY" };
    return { from: "#1a3a52", to: "#0d1f35", mono: (agency ?? "HCCS").slice(0, 4).toUpperCase() };
}

export default function HRNewsClient() {
    const { t, lang } = useLang();
    const h = t.hrNews;
    const [items, setItems] = useState<NewsRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("news")
            .select("id, title, title_cn, body, body_cn, url, agency_name, content_type, hero_image, published_at")
            .eq("is_published", true)
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(24)
            .then(({ data }) => {
                setItems((data ?? []) as NewsRow[]);
                setLoading(false);
            });
    }, []);

    const display = useMemo(
        () =>
            items.map((r) => ({
                ...r,
                displayTitle: (lang === "zh" ? r.title_cn ?? r.title : r.title ?? r.title_cn) ?? "",
                displayBody: lang === "zh" ? r.body_cn ?? r.body : r.body ?? r.body_cn,
            })),
        [items, lang]
    );

    const featured = display[0];
    const rest = display.slice(1);

    return (
        <div className="bg-[#F8F5EC] min-h-[70vh]">
            {/* Header */}
            <section className="bg-white border-b border-[#e5e0d2]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
                    <div className="text-center">
                        <p className="eyebrow">{h.fieldReportsEyebrow}</p>
                        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#0d1f35] leading-tight mb-4">
                            {h.title}
                        </h1>
                        <span className="rule-gold mx-auto" />
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mt-6">{h.desc}</p>
                    </div>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
                {loading ? (
                    <NewsSkeleton />
                ) : display.length === 0 ? (
                    <NewsEmpty />
                ) : (
                    <>
                        {featured && <FeaturedCard item={featured} lang={lang} />}
                        {rest.length > 0 && (
                            <div className="mt-12">
                                <div className="flex items-end justify-between mb-6">
                                    <h2 className="font-display text-xl sm:text-2xl text-[#0d1f35]">{h.moreUpdatesTitle}</h2>
                                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        {rest.length} {rest.length === 1 ? h.itemLabel : h.itemsLabel}
                                    </span>
                                </div>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {rest.map((r) => (
                                        <NewsCard key={r.id} item={r} lang={lang} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* CTA card at bottom */}
                <aside className="mt-20 rounded-2xl bg-[#0d1f35] text-white p-10 sm:p-12 text-center relative overflow-hidden">
                    <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#d4a84b]/10 blur-3xl" />
                    <div className="relative">
                        <p className="eyebrow eyebrow-on-dark">{h.ctaEyebrow}</p>
                        <h2 className="font-display text-2xl sm:text-3xl leading-tight mb-3">{h.ctaTitle}</h2>
                        <span className="rule-gold mx-auto mb-5" />
                        <p className="text-slate-300 max-w-2xl mx-auto mb-7 leading-relaxed">{h.ctaBody}</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link href="/consultation" className="btn-primary">
                                {h.ctaBook}
                                <span aria-hidden>→</span>
                            </Link>
                            <Link href="/compliance-scan" className="btn-on-dark">
                                {h.ctaScan}
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function FeaturedCard({
    item,
    lang,
}: {
    item: NewsRow & { displayTitle: string; displayBody: string | null };
    lang: "en" | "zh";
}) {
    const { t } = useLang();
    const h = t.hrNews;
    const swatch = agencySwatch(item.agency_name);
    const host = hostnameOf(item.url);
    const hasExternalLink = !!item.url;
    const Wrapper: React.ElementType = "a";
    const wrapperProps = hasExternalLink
        ? { href: item.url!, target: "_blank", rel: "noopener noreferrer" }
        : { href: `/hr-news/${item.id}` };
    const hasLink = true;
    return (
        <Wrapper
            {...wrapperProps}
            className={`${hasLink ? "group " : ""}block rounded-2xl overflow-hidden bg-white border border-[#e5e0d2] shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)]${hasLink ? " hover:border-[#d4a84b]/55 transition-colors" : ""}`}
        >
            <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
                {/* Visual */}
                <div className="relative min-h-[220px] lg:min-h-[320px] overflow-hidden">
                    {item.hero_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.hero_image}
                            alt={item.displayTitle}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                                background: `linear-gradient(135deg, ${swatch.from} 0%, ${swatch.to} 100%)`,
                            }}
                        >
                            <div className="text-center px-6">
                                <p className="font-display text-[#d4a84b]/85 text-5xl sm:text-6xl tracking-tight">
                                    {swatch.mono}
                                </p>
                                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">
                                    {item.agency_name}
                                </p>
                            </div>
                        </div>
                    )}
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#d4a84b] text-[#0d1f35] text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1">
                        {h.featuredBadge}
                    </span>
                </div>
                {/* Body */}
                <div className="p-7 sm:p-10 flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                        {item.agency_name && (
                            <span className="inline-flex items-center rounded-full bg-[#1a3a52]/[0.06] border border-[#1a3a52]/15 text-[#1a3a52] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 text-[10px]">
                                {item.agency_name}
                            </span>
                        )}
                        {item.published_at && (
                            <span className="text-slate-500 font-medium">{formatDate(item.published_at, lang)}</span>
                        )}
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl text-[#0d1f35] leading-tight mb-4 group-hover:text-[#1a3a52] transition-colors">
                        {item.displayTitle}
                    </h2>
                    {item.displayBody && (
                        <p className={`text-slate-600 leading-relaxed mb-6 whitespace-pre-line ${hasLink ? "line-clamp-4" : ""}`}>
                            {item.displayBody}
                        </p>
                    )}
                    {hasLink && (
                        <div className="mt-auto pt-4 flex items-center justify-between gap-4">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b8902f] group-hover:gap-2 transition-all">
                                {h.readFullStory}
                                <span aria-hidden>→</span>
                            </span>
                            {host && (
                                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 truncate">
                                    {host}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Wrapper>
    );
}

function NewsCard({
    item,
    lang,
}: {
    item: NewsRow & { displayTitle: string; displayBody: string | null };
    lang: "en" | "zh";
}) {
    const { t } = useLang();
    const h = t.hrNews;
    const swatch = agencySwatch(item.agency_name);
    const host = hostnameOf(item.url);
    const hasExternalLink = !!item.url;
    const Wrapper: React.ElementType = "a";
    const wrapperProps = hasExternalLink
        ? { href: item.url!, target: "_blank", rel: "noopener noreferrer" }
        : { href: `/hr-news/${item.id}` };
    const hasLink = true;
    return (
        <Wrapper
            {...wrapperProps}
            className={`${hasLink ? "group card-interactive " : ""}card p-0 overflow-hidden flex flex-col bg-white`}
        >
            {/* Header strip with agency */}
            <div
                className="relative h-32 flex items-center justify-center"
                style={{
                    background: item.hero_image ? undefined : `linear-gradient(135deg, ${swatch.from} 0%, ${swatch.to} 100%)`,
                }}
            >
                {item.hero_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.hero_image} alt={item.displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <p className="font-display text-[#d4a84b]/80 text-3xl tracking-tight">{swatch.mono}</p>
                )}
            </div>
            {/* Body */}
            <div className="p-6 flex flex-col flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px]">
                    {item.agency_name && (
                        <span className="inline-flex items-center rounded-full bg-[#1a3a52]/[0.06] border border-[#1a3a52]/15 text-[#1a3a52] font-semibold uppercase tracking-[0.16em] px-2 py-0.5">
                            {item.agency_name}
                        </span>
                    )}
                    {item.published_at && (
                        <span className="text-slate-500 font-medium uppercase tracking-[0.12em]">
                            {formatDate(item.published_at, lang)}
                        </span>
                    )}
                </div>
                <h3 className="font-display text-lg text-[#0d1f35] leading-snug mb-3 group-hover:text-[#1a3a52] transition-colors line-clamp-3">
                    {item.displayTitle}
                </h3>
                {item.displayBody && (
                    <p className={`text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line ${hasLink ? "line-clamp-3" : ""}`}>
                        {item.displayBody}
                    </p>
                )}
                {hasLink && (
                    <div className="mt-auto pt-3 border-t border-[#e5e0d2] flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#b8902f] group-hover:gap-2 transition-all">
                            {h.readShort}
                            <span aria-hidden>→</span>
                        </span>
                        {host && <span className="text-[10px] text-slate-400 truncate">{host}</span>}
                    </div>
                )}
            </div>
        </Wrapper>
    );
}

function NewsSkeleton() {
    return (
        <div>
            {/* Featured skeleton */}
            <div className="rounded-2xl overflow-hidden bg-white border border-[#e5e0d2] animate-pulse">
                <div className="grid lg:grid-cols-[1.1fr_1.4fr]">
                    <div className="bg-[#efe8d8] min-h-[220px] lg:min-h-[320px]" />
                    <div className="p-8 sm:p-10">
                        <div className="flex gap-2 mb-5">
                            <div className="h-5 w-20 rounded-full bg-[#efe8d8]" />
                            <div className="h-5 w-24 rounded-full bg-[#efe8d8]" />
                        </div>
                        <div className="h-7 w-5/6 rounded bg-[#efe8d8] mb-3" />
                        <div className="h-7 w-4/6 rounded bg-[#efe8d8] mb-5" />
                        <div className="h-3 w-full rounded bg-[#efe8d8] mb-2" />
                        <div className="h-3 w-11/12 rounded bg-[#efe8d8] mb-2" />
                        <div className="h-3 w-9/12 rounded bg-[#efe8d8]" />
                    </div>
                </div>
            </div>
            {/* Grid skeleton */}
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="card p-0 overflow-hidden animate-pulse">
                        <div className="h-32 bg-[#efe8d8]" />
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <div className="h-4 w-16 rounded-full bg-[#efe8d8]" />
                                <div className="h-4 w-20 rounded-full bg-[#efe8d8]" />
                            </div>
                            <div className="h-4 w-5/6 rounded bg-[#efe8d8] mb-2" />
                            <div className="h-4 w-3/4 rounded bg-[#efe8d8] mb-5" />
                            <div className="h-3 w-full rounded bg-[#efe8d8] mb-2" />
                            <div className="h-3 w-4/6 rounded bg-[#efe8d8]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function NewsEmpty() {
    const { t } = useLang();
    const h = t.hrNews;
    return (
        <div className="rounded-2xl bg-white border border-[#e5e0d2] p-12 text-center">
            <p className="font-display text-2xl text-[#0d1f35] mb-3">{h.emptyTitle}</p>
            <span className="rule-gold mx-auto mb-5" />
            <p className="text-slate-600 max-w-md mx-auto leading-relaxed mb-7">{h.emptyBody}</p>
            <div className="flex flex-wrap justify-center gap-3">
                <Link href="/compliance-scan" className="btn-primary">
                    {h.emptyCtaScan}
                </Link>
                <Link href="/consultation" className="btn-ghost">
                    {h.emptyCtaBook}
                </Link>
            </div>
        </div>
    );
}
