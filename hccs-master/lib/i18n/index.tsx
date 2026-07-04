"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

export type Lang = "en" | "zh";
export type Translations = typeof en;

const baseTranslations: Record<Lang, Translations> = { en, zh };

type FlatOverrides = { en: Record<string, string>; zh: Record<string, string> };

interface LangContextValue {
    lang: Lang;
    t: Translations;
    toggle: () => void;
}

const LangContext = createContext<LangContextValue>({
    lang: "en",
    t: en,
    toggle: () => {},
});

// Walk a dotted key into the cloned locale tree and replace ONLY if the
// existing value is a string. Arrays + nested objects are left untouched.
function applyOverride(tree: unknown, key: string, value: string) {
    const parts = key.split(".");
    let cur: any = tree;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!cur || typeof cur !== "object") return;
        cur = cur[parts[i]];
    }
    if (!cur || typeof cur !== "object") return;
    const leaf = parts[parts.length - 1];
    if (typeof cur[leaf] === "string") cur[leaf] = value;
}

function mergeOverrides(lang: Lang, overrides: FlatOverrides | null): Translations {
    const base = baseTranslations[lang];
    if (!overrides || !overrides[lang]) return base;
    const entries = Object.entries(overrides[lang]);
    if (entries.length === 0) return base;
    const merged = structuredClone(base);
    for (const [k, v] of entries) applyOverride(merged, k, v);
    return merged as Translations;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Lang>("en");
    const [overrides, setOverrides] = useState<FlatOverrides | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("hccs-lang") as Lang | null;
        if (saved === "en" || saved === "zh") setLang(saved);
    }, []);

    // Fetch overrides once per session. Quietly falls back to JSON on failure.
    useEffect(() => {
        let cancelled = false;
        fetch("/api/translations")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!cancelled && data && (data.en || data.zh)) {
                    setOverrides({ en: data.en ?? {}, zh: data.zh ?? {} });
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const t = useMemo(() => mergeOverrides(lang, overrides), [lang, overrides]);

    const toggle = () => {
        setLang((prev) => {
            const next: Lang = prev === "en" ? "zh" : "en";
            localStorage.setItem("hccs-lang", next);
            return next;
        });
    };

    return (
        <LangContext.Provider value={{ lang, t, toggle }}>
            {children}
        </LangContext.Provider>
    );
}

export function useLang() {
    return useContext(LangContext);
}
