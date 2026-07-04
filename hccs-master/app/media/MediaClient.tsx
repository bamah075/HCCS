"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

type MediaRow = {
    id: number;
    title: string | null;
    title_cn: string | null;
    short_description: string | null;
    short_description_cn: string | null;
    image: string | null;
    link: string | null;
    display_order: number | null;
};

function platformOf(url: string | null): "youtube" | "tiktok" | "instagram" | "facebook" | "other" {
    if (!url) return "other";
    if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
    if (/tiktok\.com/i.test(url)) return "tiktok";
    if (/instagram\.com/i.test(url)) return "instagram";
    if (/facebook\.com|fb\.com/i.test(url)) return "facebook";
    return "other";
}

function isAbsolute(u: string | null): boolean {
    return !!u && /^https?:\/\//i.test(u);
}

export default function MediaClient() {
    const { t, lang } = useLang();
    const media = t.media;
    const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";

    const [rows, setRows] = useState<MediaRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("media")
            .select("id, title, title_cn, short_description, short_description_cn, image, link, display_order")
            .eq("is_active", true)
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("id", { ascending: true })
            .then(({ data }) => {
                setRows((data ?? []) as MediaRow[]);
                setLoading(false);
            });
    }, []);

    const items = useMemo(
        () =>
            rows.map((r) => ({
                ...r,
                displayTitle: (lang === "zh" ? r.title_cn ?? r.title : r.title ?? r.title_cn) ?? "",
                displayDesc: lang === "zh" ? r.short_description_cn ?? r.short_description : r.short_description ?? r.short_description_cn,
                platform: platformOf(r.link),
                imageSrc: isAbsolute(r.image) ? r.image! : `${storageUrl}${r.image ?? ""}`,
            })),
        [rows, lang, storageUrl]
    );

    const socialLinks = [
        { href: "https://www.tiktok.com/@askbeebeesghr",  label: media.followTikTok, brand: "TikTok" },
        { href: "https://www.facebook.com/hccs.sg/",       label: media.facebook,     brand: "Facebook" },
        { href: "https://sg.linkedin.com/in/bee-bee-ker", label: media.linkedin,     brand: "LinkedIn" },
    ];

    return (
        <div className="min-h-screen bg-[#0a1628] text-white">
            {/* Hero */}
            <section className="relative overflow-hidden pt-20 pb-12 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#2a5a8a]/25 blur-3xl" />
                </div>
                <div className="relative max-w-5xl mx-auto text-center">
                    <p className="eyebrow eyebrow-on-dark">{media.badge}</p>
                    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-4 leading-[1.05]">
                        {media.title}
                    </h1>
                    <span className="rule-gold mx-auto mb-6" />
                    <p className="text-slate-300 text-base max-w-xl mx-auto leading-relaxed mb-9">{media.desc}</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {socialLinks.map((item) => (
                            <a
                                key={item.brand}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-full text-sm transition-all bg-white/10 border border-white/20 hover:border-[#d4a84b]/60 hover:bg-white/15"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Grid */}
            <section className="max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <MediaSkeleton />
                ) : items.length === 0 ? (
                    <EmptyState media={media} />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 items-start">
                        {items.map((item, i) => {
                            const isLandscape = item.platform === "youtube";
                            return (
                                <a
                                    key={item.id}
                                    href={item.link ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`group relative block rounded-xl overflow-hidden bg-[#0d1f35] border border-white/10 hover:border-[#d4a84b]/55 transition-all ${
                                        isLandscape ? "col-span-2" : ""
                                    }`}
                                >
                                    <div className={`relative overflow-hidden ${isLandscape ? "aspect-video" : "aspect-[9/16]"}`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.imageSrc}
                                            alt={item.displayTitle || `Video ${i + 1}`}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/85 via-[#0a1628]/15 to-transparent pointer-events-none" />

                                        {/* Play indicator */}
                                        <span className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur text-[#0d1f35] shadow-md transition-transform group-hover:scale-110">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </span>

                                        {/* Platform pill */}
                                        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] font-semibold text-white/85 bg-black/40 backdrop-blur px-2 py-1 rounded-full">
                                            {item.platform === "youtube" ? "YouTube" :
                                             item.platform === "tiktok" ? "TikTok" :
                                             item.platform === "instagram" ? "Instagram" :
                                             item.platform === "facebook" ? "Facebook" : "Video"}
                                        </span>

                                        {/* Title overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            {item.displayTitle && (
                                                <h3 className="font-display text-base sm:text-lg text-white leading-snug drop-shadow mb-1 line-clamp-2">
                                                    {item.displayTitle}
                                                </h3>
                                            )}
                                            {item.displayDesc && (
                                                <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                                                    {item.displayDesc}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* CTA */}
            <section className="border-t border-white/10 py-16 px-4 text-center">
                <p className="eyebrow eyebrow-on-dark">{media.badge}</p>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-3 leading-tight">{media.ctaTitle}</h2>
                <span className="rule-gold mx-auto mb-5" />
                <p className="text-slate-300 text-sm max-w-xl mx-auto mb-7 leading-relaxed">{media.ctaDesc}</p>
                <a
                    href="https://www.tiktok.com/@askbeebeesghr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                >
                    {media.followTikTok}
                    <span aria-hidden>→</span>
                </a>
            </section>
        </div>
    );
}

function MediaSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 animate-pulse aspect-[9/16]" />
            ))}
        </div>
    );
}

function EmptyState({ media }: { media: { ctaTitle: string; ctaDesc: string; followTikTok: string } }) {
    return (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-12 text-center max-w-2xl mx-auto">
            <p className="font-display text-2xl text-white mb-3">{media.ctaTitle}</p>
            <span className="rule-gold mx-auto mb-5" />
            <p className="text-slate-300 mb-7 leading-relaxed">{media.ctaDesc}</p>
            <a
                href="https://www.tiktok.com/@askbeebeesghr"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
            >
                {media.followTikTok}
            </a>
        </div>
    );
}
