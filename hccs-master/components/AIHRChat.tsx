"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

type ChatRole = "user" | "assistant";
interface ChatMessage {
    role: ChatRole;
    content: string;
    streaming?: boolean;
}
interface UsageInfo {
    tier: string;
    used: number;
    remaining: number;
    weeklyLimit: number;
    ready: boolean;
}

type SpeechRecognitionLike = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
    onerror: ((e: { error?: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SuggestionTier = "Free" | "Essential" | "Professional" | "Strategic";

/**
 * Tier-aware starter questions. Calibrated to each tier's capability so people
 * can click without thinking and get a meaningful demo of what that tier does.
 * When demoTier is undefined (member portal / authenticated users), returns a
 * balanced set that works across tiers.
 */
function pickSuggestions(tier: SuggestionTier | undefined, isZH: boolean): string[] {
    const SUGGESTIONS: Record<SuggestionTier | "default", { en: string[]; zh: string[] }> = {
        Free: {
            en: [
                "Are written employment contracts required by law in Singapore?",
                "What's the minimum qualifying salary for an Employment Pass in 2026?",
                "Is overtime pay mandatory for managers and executives?",
            ],
            zh: [
                "新加坡法律是否要求签订书面雇佣合同？",
                "2026 年 Employment Pass 的最低工资门槛是多少？",
                "经理与主管是否必须获得加班费？",
            ],
        },
        Essential: {
            en: [
                "Compare hiring an EP holder vs an S Pass holder for a S$4,500/month role.",
                "What's the difference between sick leave, hospitalisation leave, and childcare leave?",
                "When does the Fair Consideration Framework require a MyCareersFuture posting?",
            ],
            zh: [
                "请对比聘用 EP 持有人与 S Pass 持有人（月薪 S$4,500 的职位）的差异。",
                "请说明病假、住院假与育儿假的区别与天数上限。",
                "Fair Consideration Framework 要求在哪些情况下必须先在 MyCareersFuture 刊登职位？",
            ],
        },
        Professional: {
            en: [
                "Calculate monthly CPF for a Singapore citizen earning S$6,500 with a S$15,000 year-end bonus, age 56.",
                "Draft a written warning letter for an employee with 3 documented tardiness incidents this month.",
                "Walk through the safest termination process for an underperforming employee with 4 years of service.",
            ],
            zh: [
                "请为月薪 S$6,500、年底奖金 S$15,000、年龄 56 的新加坡公民员工，计算月度 CPF（含 OW 上限与 AW 处理）。",
                "请为本月已 3 次迟到、有书面记录的员工起草一封书面警告信。",
                "请详述如何安全合规地解雇一名服务满 4 年但表现不达标的员工，包括程序与文件。",
            ],
        },
        Strategic: {
            en: [
                "We're acquiring a 60-person logistics firm with 25 Work Permit holders. What HR risks should we model in due diligence?",
                "I need to second a Singapore engineer to our Malaysia office for 18 months. CPF, tax, and pass implications?",
                "Help me design a fair total-reward framework for a workforce mixing CPF-eligible locals and non-CPF foreign staff.",
            ],
            zh: [
                "我们正在收购一家拥有 60 名员工、其中 25 名持有 Work Permit 的物流公司。在尽职调查中应建模哪些 HR 风险？",
                "我需要将一名新加坡工程师外派至马来西亚办公室 18 个月。请说明 CPF、税务与工作准证方面的影响。",
                "请帮我设计一套公平的薪酬框架，覆盖享有 CPF 的本地员工与不缴 CPF 的外籍员工。",
            ],
        },
        // Used when no demoTier is set (e.g. member portal with real auth)
        default: {
            en: [
                "Can I terminate an underperforming employee during their medical leave?",
                "If I hire 5 EP holders for my 15-person services firm, am I within the DRC?",
                "How should I redesign job ads to comply with the Workplace Fairness Act 2025?",
            ],
            zh: [
                "员工正在休病假，我可以解雇表现不佳的他/她吗？",
                "我的 15 人服务业公司若再聘 5 名 EP 持有人，是否仍符合 DRC 上限？",
                "如何重新设计招聘广告以符合 2025 年《公平职场法案》（WFA）？",
            ],
        },
    };
    const bucket = tier ? SUGGESTIONS[tier] : SUGGESTIONS.default;
    return isZH ? bucket.zh : bucket.en;
}

interface AIHRChatProps {
    compact?: boolean;
    /** @deprecated Use demoToken instead. Kept only for transitional builds. */
    demoKey?: string;
    /** Short-lived demo session token from /api/security/demo-session. */
    demoToken?: string;
    demoTier?: "Free" | "Essential" | "Professional" | "Strategic";
    /** When set, locks the chat after N user messages and shows a subscribe paywall. */
    trialMessageLimit?: number;
    /** Optional URL the paywall CTA links to. Defaults to /membership. */
    upgradeHref?: string;
}

export default function AIHRChat({ compact = false, demoKey, demoToken, demoTier, trialMessageLimit, upgradeHref = "/membership" }: AIHRChatProps) {
    const { lang } = useLang();
    const isZH = lang === "zh";
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [usage, setUsage] = useState<UsageInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Reset messages when demo tier changes.
    useEffect(() => {
        if (demoTier) setMessages([]);
    }, [demoTier]);

    // Load usage on mount (and whenever demo session changes).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const headers: Record<string, string> = {};
            if (demoToken) {
                headers["X-AIHR-Demo-Token"] = demoToken;
            } else if (demoKey && demoTier) {
                headers["X-AIHR-Demo-Key"] = demoKey;
                headers["X-AIHR-Demo-Tier"] = demoTier;
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const r = await fetch("/api/aihr/chat", { headers }).catch(() => null);
            if (!r || !r.ok) return;
            const data = await r.json();
            if (!cancelled) setUsage(data);
        })();
        return () => { cancelled = true; };
    }, [demoKey, demoToken, demoTier]);

    // Auto-scroll on new content.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Detect browser voice support.
    useEffect(() => {
        const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
        const hasSR = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
        const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
        setVoiceSupported(hasSR && hasTTS);
    }, []);

    // Load + cache the available TTS voices. Browsers populate this list asynchronously,
    // so we listen for `voiceschanged` and also do an immediate read in case it's already ready.
    useEffect(() => {
        if (!("speechSynthesis" in window)) return;
        const load = () => {
            const list = window.speechSynthesis.getVoices();
            if (list.length) voicesRef.current = list;
        };
        load();
        window.speechSynthesis.onvoiceschanged = load;
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // On first mount, draw the eye to the input. We use a focus-visible ring rather than .focus()
    // so the page doesn't auto-scroll and yank a mobile user to the bottom of the chat.
    useEffect(() => {
        const t = setTimeout(() => {
            inputRef.current?.focus({ preventScroll: true });
        }, 600);
        return () => clearTimeout(t);
    }, []);

    /**
     * Pick the highest-quality available voice for a given language.
     * Browsers ship a mix of robotic local voices and better neural/cloud ones — this
     * helper applies a priority list so we get the best one without the user noticing.
     */
    function pickBestVoice(lang: "en" | "zh"): SpeechSynthesisVoice | null {
        const voices = voicesRef.current;
        if (!voices.length) return null;

        // Score each voice. Higher = better. Pick the highest scorer that matches the lang.
        function score(v: SpeechSynthesisVoice): number {
            const name = v.name.toLowerCase();
            const langTag = v.lang.toLowerCase();

            // Lang must match (zh-* or en-*).
            const wantPrefix = lang === "zh" ? "zh" : "en";
            if (!langTag.startsWith(wantPrefix)) return -1;

            let s = 0;
            // macOS downloaded high-quality voices show "(Premium)" or "(Enhanced)" in the name.
            if (/premium/.test(name)) s += 100;
            if (/enhanced/.test(name)) s += 80;
            if (/neural/.test(name)) s += 70;       // Some neural voices include "Neural" in name
            // Microsoft Online neural voices (Edge / Windows) — typically very high quality
            if (/online/.test(name) && /microsoft/.test(name)) s += 60;
            // Specific high-quality named voices we know to be good
            if (lang === "en") {
                if (/(samantha|ava|allison|joanne|nicky|tom)/.test(name)) s += 40;  // mac iOS premium-ish
                if (/(karen|daniel|moira|fiona|kate|serena)/.test(name)) s += 30;  // mac defaults — clearer than US default
                if (/(aria|jenny|guy|davis)/.test(name)) s += 30;                  // Windows neural voices
                if (/google.*english/.test(name)) s += 25;
            } else {
                if (/(meijia|tian-tian|tingting|tian)/.test(name)) s += 40;
                if (/(xiaoxiao|xiaoyi|yunxi|yunyang|yunjian)/.test(name)) s += 35; // Windows MS neural Mandarin
                if (/google.*(普通话|mandarin|zh)/.test(name)) s += 25;
            }
            // localService=false often means cloud-based (Google/Microsoft Online), usually higher fidelity.
            // localService=true is on-device (faster, but sometimes lower quality).
            if (v.localService === false) s += 10;
            // Exact zh-CN / en-SG / en-GB / en-AU preference (closer to SG users than en-US).
            if (lang === "zh" && langTag === "zh-cn") s += 5;
            if (lang === "en" && (langTag === "en-sg" || langTag === "en-gb" || langTag === "en-au")) s += 5;
            return s;
        }

        let best: SpeechSynthesisVoice | null = null;
        let bestScore = -1;
        for (const v of voices) {
            const sc = score(v);
            if (sc > bestScore) { best = v; bestScore = sc; }
        }
        return best;
    }

    async function speakText(text: string, idx: number | null = null) {
        const clean = stripMarkdown(text);
        if (!clean) return;
        // Stop anything currently playing first.
        stopSpeaking();

        if (!("speechSynthesis" in window)) return;
        // Make sure the voice list is loaded (some browsers populate lazily on first call).
        if (!voicesRef.current.length) {
            voicesRef.current = window.speechSynthesis.getVoices();
        }

        const u = new SpeechSynthesisUtterance(clean);
        const picked = pickBestVoice(isZH ? "zh" : "en");
        if (picked) u.voice = picked;
        u.lang = isZH ? "zh-CN" : "en-SG";
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onstart = () => { setSpeaking(true); setSpeakingIdx(idx); };
        u.onend = () => { setSpeaking(false); setSpeakingIdx(null); };
        u.onerror = () => { setSpeaking(false); setSpeakingIdx(null); };
        window.speechSynthesis.speak(u);
    }

    function stopSpeaking() {
        if (audioRef.current) {
            try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch {}
            audioRef.current = null;
        }
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        setSpeaking(false);
        setSpeakingIdx(null);
    }

    function stripMarkdown(s: string): string {
        return s
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/[*_`#>]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function startListening() {
        const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
        const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
        if (!Ctor) return;
        const rec = new Ctor();
        rec.lang = isZH ? "zh-CN" : "en-SG";
        rec.interimResults = true;
        rec.continuous = false;
        let finalText = "";
        rec.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
                const transcript = r[0].transcript;
                if (r.isFinal) finalText += transcript;
                else interim += transcript;
            }
            setInput((finalText + interim).trim());
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
        setListening(true);
        rec.start();
    }

    function stopListening() {
        recognitionRef.current?.stop();
        setListening(false);
    }

    const placeholderText = isZH
        ? "请问关于新加坡 HR 合规、CPF、人力部规定的任何问题…"
        : "Ask about Singapore HR compliance, CPF, MOM rules…";

    const greetingText = isZH
        ? "您好！我是 AIHR，新加坡中小企业的人力资源合规助手。请问有什么可以帮您？"
        : "Hi! I'm AIHR — Singapore HR compliance assistant for SMEs. What can I help you with?";

    async function send(override?: string) {
        const text = (override ?? input).trim();
        if (!text || busy) return;
        setError(null);

        const userMsg: ChatMessage = { role: "user", content: text };
        const placeholder: ChatMessage = { role: "assistant", content: "", streaming: true };
        const nextMessages = [...messages, userMsg, placeholder];
        setMessages(nextMessages);
        setInput("");
        setBusy(true);

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (demoToken) {
                headers["X-AIHR-Demo-Token"] = demoToken;
            } else if (demoKey && demoTier) {
                headers["X-AIHR-Demo-Key"] = demoKey;
                headers["X-AIHR-Demo-Tier"] = demoTier;
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const res = await fetch("/api/aihr/chat", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    messages: nextMessages
                        .filter((m) => !m.streaming && m.content.trim())
                        .map((m) => ({ role: m.role, content: m.content })),
                    lang: isZH ? "zh" : "en",
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                const errMsg = data?.message || data?.error || (isZH ? "助手暂时无法回复，请稍后再试。" : "Assistant is temporarily unavailable.");
                // Replace placeholder with error inline.
                setMessages((prev) => prev.slice(0, -1).concat({
                    role: "assistant",
                    content: errMsg,
                }));
                setError(errMsg);
                if (data?.usage) {
                    setUsage({
                        tier: data.tier ?? "Free",
                        used: data.usage.count,
                        remaining: data.usage.remaining,
                        weeklyLimit: data.usage.limit,
                        ready: true,
                    });
                }
                setBusy(false);
                return;
            }

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let acc = "";
            let usageHeaderConsumed = false;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                // First line may be a usage header: "__usage:{json}\n"
                if (!usageHeaderConsumed && buffer.includes("\n")) {
                    const firstNewline = buffer.indexOf("\n");
                    const firstLine = buffer.slice(0, firstNewline);
                    if (firstLine.startsWith("__usage:")) {
                        try {
                            const u = JSON.parse(firstLine.slice("__usage:".length));
                            setUsage({
                                tier: u.tier,
                                used: u.count,
                                remaining: u.remaining,
                                weeklyLimit: u.limit,
                                ready: true,
                            });
                        } catch {}
                        buffer = buffer.slice(firstNewline + 1);
                    }
                    usageHeaderConsumed = true;
                }

                if (buffer) {
                    acc += buffer;
                    buffer = "";
                    setMessages((prev) => {
                        const next = prev.slice(0, -1);
                        next.push({ role: "assistant", content: acc, streaming: true });
                        return next;
                    });
                }
            }
            // Finalize (no streaming flag).
            setMessages((prev) => {
                const next = prev.slice(0, -1);
                next.push({ role: "assistant", content: acc.trim() });
                return next;
            });
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            setError(errMsg);
            setMessages((prev) => prev.slice(0, -1).concat({
                role: "assistant",
                content: isZH ? "连接出错，请稍后再试。" : "Connection error. Please try again.",
            }));
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    }

    function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    const limitReached = usage && usage.weeklyLimit !== -1 && usage.remaining === 0;
    const userTurnCount = messages.filter((m) => m.role === "user").length;
    const trialLocked = typeof trialMessageLimit === "number" && userTurnCount >= trialMessageLimit;
    const remainingTrial = typeof trialMessageLimit === "number" ? Math.max(0, trialMessageLimit - userTurnCount) : null;

    return (
        <div className={`flex flex-col h-full bg-[#F8F5EC] ${compact ? "" : "rounded-2xl border border-[#e5e0d2] overflow-hidden"}`}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0d1f35] text-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#d4a84b]/15 border border-[#d4a84b]/40 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#d4a84b]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-5z"/></svg>
                    </div>
                    <div className="leading-tight">
                        <p className="font-display text-sm">AIHR</p>
                        <p className="text-[10px] text-slate-300 uppercase tracking-[0.16em]">
                            {usage?.tier ?? "Free"} · {isZH ? "人力资源合规助手" : "HR Compliance Assistant"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            stopSpeaking();
                            setMessages([]);
                            setInput("");
                            setError(null);
                        }}
                        disabled={messages.length === 0}
                        title={isZH ? "重新开始对话" : "Restart chat"}
                        aria-label={isZH ? "重新开始对话" : "Restart chat"}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white bg-white/10 hover:bg-[#d4a84b] hover:text-[#0d1f35] border border-white/40 hover:border-[#d4a84b] rounded-full px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3.2-6.9M3 4v5h5" />
                        </svg>
                        {isZH ? "重新开始" : "Restart"}
                    </button>
                    {usage && usage.weeklyLimit !== -1 && (
                        <p className="text-[10px] text-slate-300 uppercase tracking-[0.14em]">
                            {usage.used}/{usage.weeklyLimit} {isZH ? "本周" : "this week"}
                        </p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-sm text-slate-600 bg-white border border-[#e5e0d2] rounded-lg p-4 leading-relaxed">
                        <p className="font-semibold text-[#0d1f35] mb-1">AIHR</p>
                        <p>{greetingText}</p>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                            {isZH ? "点击一个问题，或在下方输入框提问" : "Tap a question, or type your own below ↓"}
                        </p>
                        <div className="mt-2 flex flex-col gap-2">
                            {pickSuggestions(demoTier, isZH).map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    disabled={busy || limitReached === true}
                                    onClick={() => send(q)}
                                    className="text-left text-sm text-[#0d1f35] bg-[#F8F5EC] hover:bg-[#d4a84b]/15 border border-[#e5e0d2] hover:border-[#d4a84b]/60 rounded-lg px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] ${m.role === "assistant" ? "flex flex-col gap-1" : ""}`}>
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                m.role === "user"
                                    ? "bg-[#0d1f35] text-white rounded-br-sm whitespace-pre-wrap"
                                    : "bg-white text-[#0d1f35] border border-[#e5e0d2] rounded-bl-sm"
                            }`}>
                                {m.role === "user" ? (
                                    m.content
                                ) : m.content ? (
                                    <div className="chat-md">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline text-[#b8902f] hover:text-[#0d1f35]" />,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                        {m.streaming && (
                                            <span className="inline-block w-1.5 h-3 align-middle ml-0.5 bg-[#d4a84b] animate-pulse" />
                                        )}
                                    </div>
                                ) : (
                                    m.streaming && (isZH ? "思考中…" : "Thinking…")
                                )}
                            </div>
                            {/* Per-message Listen button — prominent gold pill so it's discoverable */}
                            {m.role === "assistant" && m.content && !m.streaming && voiceSupported && (() => {
                                const isThisPlaying = speakingIdx === i;
                                return (
                                    <button
                                        type="button"
                                        onClick={() => (isThisPlaying ? stopSpeaking() : speakText(m.content, i))}
                                        className={`self-start inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                                            isThisPlaying
                                                ? "bg-[#d4a84b] text-[#0d1f35] border-[#d4a84b] animate-pulse"
                                                : "bg-white text-[#0d1f35] border-[#d4a84b]/50 hover:bg-[#d4a84b] hover:text-[#0d1f35] hover:border-[#d4a84b]"
                                        }`}
                                        title={isThisPlaying ? (isZH ? "停止朗读" : "Stop") : (isZH ? "朗读这条回复" : "Listen to this reply")}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            {isThisPlaying ? (
                                                <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
                                            ) : (
                                                <>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
                                                </>
                                            )}
                                        </svg>
                                        <span>{isThisPlaying ? (isZH ? "正在朗读…" : "Speaking…") : (isZH ? "🔊 朗读" : "🔊 Listen")}</span>
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Limit-reached banner */}
            {limitReached && (
                <div className="px-4 py-2 bg-[#d4a84b]/15 border-t border-[#d4a84b]/40 text-xs text-[#0d1f35]">
                    {isZH ? (
                        <>本周免费额度已用完。<a href="/membership" className="font-semibold underline">升级至 Essential</a> 获取更高用量。</>
                    ) : (
                        <>You've used all your free weekly messages. <a href="/membership" className="font-semibold underline">Upgrade to Essential</a> for more.</>
                    )}
                </div>
            )}

            {/* Trial counter — only shown while still in trial */}
            {!trialLocked && remainingTrial !== null && (
                <div className="px-4 py-1.5 bg-[#d4a84b]/15 border-t border-[#d4a84b]/40 text-[10px] uppercase tracking-[0.18em] text-[#0d1f35] text-center font-semibold">
                    {isZH
                        ? `试用剩余 ${remainingTrial} 条消息`
                        : `${remainingTrial} trial message${remainingTrial === 1 ? "" : "s"} remaining`}
                </div>
            )}

            {/* Trial-limit paywall: replaces the input area when the trial is exhausted. */}
            {trialLocked ? (
                <div className="border-t border-[#d4a84b]/40 bg-gradient-to-br from-[#0d1f35] to-[#1a3a52] text-white p-5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8c97a] mb-2">
                        {isZH ? "试用结束" : "Trial complete"}
                    </p>
                    <p className="text-sm font-semibold leading-snug mb-3">
                        {isZH
                            ? `您已试用 ${trialMessageLimit} 条 ${demoTier ?? ""} 层级问答。`
                            : `You've used your ${trialMessageLimit} ${demoTier ?? ""} trial messages.`}
                    </p>
                    <a
                        href={upgradeHref}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#d4a84b] px-4 py-2 text-sm font-semibold text-[#0d1f35] hover:bg-[#b8902f] hover:text-white transition-colors"
                    >
                        {isZH ? `订阅 ${demoTier ?? ""} 解锁完整功能` : `Subscribe to ${demoTier ?? "AIHR"} for full access`}
                        <span aria-hidden>→</span>
                    </a>
                </div>
            ) : (
            /* Input */
            <div className="border-t border-[#e5e0d2] bg-white p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKey}
                        rows={1}
                        placeholder={listening ? (isZH ? "正在聆听…" : "Listening…") : placeholderText}
                        disabled={busy || limitReached === true}
                        aria-label={isZH ? "在此输入您的问题" : "Type your question here"}
                        className="flex-1 resize-none rounded-lg border-2 border-[#d4a84b]/40 bg-white px-3 py-2 text-sm text-[#0d1f35] placeholder:text-slate-500 focus:outline-none focus:border-[#d4a84b] focus:ring-2 focus:ring-[#d4a84b]/30 disabled:opacity-50 transition-shadow"
                        style={{ maxHeight: "120px" }}
                    />
                    {voiceSupported && (
                        <button
                            type="button"
                            onClick={() => (listening ? stopListening() : startListening())}
                            disabled={busy || limitReached === true}
                            title={listening ? (isZH ? "停止" : "Stop") : (isZH ? "语音输入" : "Voice input")}
                            className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors disabled:opacity-40 ${
                                listening
                                    ? "bg-red-500 text-white border-red-500 animate-pulse"
                                    : "bg-white text-[#0d1f35] border-[#e5e0d2] hover:bg-[#F8F5EC]"
                            }`}
                            aria-pressed={listening}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="3" width="6" height="12" rx="3" />
                                <path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                            </svg>
                        </button>
                    )}
                    {speaking && (
                        <button
                            type="button"
                            onClick={stopSpeaking}
                            title={isZH ? "停止朗读" : "Stop speaking"}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#0d1f35] text-white border border-[#0d1f35]"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                        </button>
                    )}
                    <button
                        onClick={() => send()}
                        disabled={busy || !input.trim() || limitReached === true}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-[#d4a84b] text-[#0d1f35] font-semibold text-sm hover:bg-[#b8902f] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {busy ? "…" : (isZH ? "发送" : "Send")}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    {isZH
                        ? "AIHR 仅提供一般 HR 合规指引，不构成法律意见。请勿输入身份证或个人敏感信息。"
                        : "AIHR provides general guidance only — not legal advice. Don't share NRIC or personal data."}
                </p>
                {usage?.tier === "Free" && (
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {isZH ? (
                            <>Essential：详尽解析与对比。Professional：实际计算与文件起草。Strategic：跨境与全公司政策。 <a href="/membership" className="underline hover:text-[#0d1f35]">查看方案</a></>
                        ) : (
                            <>Essential: detailed write-ups & comparisons. Professional: live calculations & drafting. Strategic: cross-border & policy frameworks. <a href="/membership" className="underline hover:text-[#0d1f35]">See plans</a></>
                        )}
                    </p>
                )}
                {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
            </div>
            )}
        </div>
    );
}
