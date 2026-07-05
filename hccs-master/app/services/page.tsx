"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

type Service = {
    id: number;
    title: string | null;
    title_cn: string | null;
    short_description: string | null;
    short_description_cn: string | null;
    slug: string;
};

export default function ServicesPage() {
    const { t, lang } = useLang();
    const s = t.services;
    const [serviceList, setServiceList] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("services")
            .select("id, title, title_cn, short_description, short_description_cn, slug")
            .order("id")
            .then(({ data }) => {
                setServiceList((data ?? []).filter((s): s is Service => Boolean(s.slug)));
                setLoading(false);
            });
    }, []);

    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a52] via-[#0d1f35] to-[#0a1628] py-20 sm:py-24 text-white">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#d4a84b]/15 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#2a5a8a]/20 blur-3xl" />
                </div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight mb-5">{s.title}</h1>
                    <span className="rule-gold mx-auto mb-6" />
                    <p className="text-slate-200 text-lg max-w-2xl mx-auto leading-relaxed mt-3">
                        {s.desc}
                    </p>
                </div>
            </section>

            {/* Highlights */}
            <section className="bg-[#F8F5EC] py-14 sm:py-16 border-b border-[#e5e0d2]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {s.highlights.map((item) => (
                            <div
                                key={item.title}
                                className="card p-6 bg-white"
                            >
                                <div className="w-2 h-8 bg-[#d4a84b] rounded-full mb-4" />
                                <h2 className="font-display text-base text-[#0d1f35] mb-2">{item.title}</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services grid */}
            <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <p className="eyebrow">{s.engagementsEyebrow}</p>
                        <h2 className="section-title">{s.browseTitle}</h2>
                        <span className="rule-gold mt-4 mx-auto" />
                    </div>

                    {loading ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label={s.loading} aria-busy="true">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="card p-6 animate-pulse">
                                    <div className="w-12 h-12 rounded-lg bg-[#F8F5EC] mb-4" />
                                    <div className="h-4 w-2/3 rounded bg-[#efe8d8] mb-3" />
                                    <div className="h-3 w-full rounded bg-[#efe8d8] mb-2" />
                                    <div className="h-3 w-5/6 rounded bg-[#efe8d8] mb-2" />
                                    <div className="h-3 w-4/6 rounded bg-[#efe8d8] mb-5" />
                                    <div className="h-3 w-24 rounded bg-[#efe8d8]" />
                                </div>
                            ))}
                        </div>
                    ) : serviceList.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">{s.loading}</p>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {serviceList.map((service, index) => {
                                const title = lang === "zh" ? (service.title_cn ?? service.title ?? "") : (service.title ?? service.title_cn ?? "");
                                const shortDescription = lang === "zh"
                                    ? (service.short_description_cn ?? service.short_description ?? "")
                                    : (service.short_description ?? service.short_description_cn ?? "");
                                return (
                                    <Link
                                        key={service.id}
                                        href={`/services/${service.slug}`}
                                        className="group card card-interactive p-6 flex flex-col h-full"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-[#1a3a52]/5 border border-[#1a3a52]/15 text-[#1a3a52] flex items-center justify-center mb-4 font-display text-base">
                                            {String(index + 1).padStart(2, "0")}
                                        </div>
                                        <h3 className="font-display text-lg text-[#0d1f35] mb-2 transition-colors group-hover:text-[#1a3a52]">
                                            {title}
                                        </h3>
                                        <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">
                                            {shortDescription}
                                        </p>
                                        <p className="inline-flex items-center gap-1.5 text-[#b8902f] text-sm font-semibold">
                                            {t.common.learnMore}
                                            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Closing CTA */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="relative overflow-hidden rounded-3xl bg-[#0d1f35] text-white py-14 px-6 sm:px-10 text-center">
                    <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#d4a84b]/12 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#2a5a8a]/25 blur-3xl" />
                    <div className="relative">
                        <p className="eyebrow eyebrow-on-dark">{s.nextStepEyebrow}</p>
                        <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-3">{s.ctaTitle}</h2>
                        <span className="rule-gold mx-auto mb-5" />
                        <p className="text-slate-300 mb-7 max-w-2xl mx-auto leading-relaxed">
                            {s.ctaDesc}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link href="/consultation" className="btn-primary">
                                {s.ctaButton}
                                <span aria-hidden>→</span>
                            </Link>
                            <Link href="/compliance-scan" className="btn-on-dark">
                                {t.common.freeScan}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
