"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import AIHRChat from "@/components/AIHRChat";

export default function AIHROverlayTrigger() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="hover:scale-105 transition-transform"
                title="Try AIHR"
            >
                <img
                    src="https://media.base44.com/images/public/69c3928519db1fee4acc175a/ac1e1ceb4_Untitleddesign2.png"
                    alt="Try AIHR"
                    className="w-28 sm:w-40 md:w-52 h-auto object-contain"
                />
            </button>

            {mounted &&
                isOpen &&
                createPortal(
                    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="fixed right-4 top-4 z-[201] rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                        >
                            Close
                        </button>

                        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto pt-4 md:pt-8 pb-4 md:pb-8 px-3 md:px-6 pointer-events-auto">
                            <div className="w-full max-w-[1600px]">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">Try AIHR - Your AI-Powered HR Assistant</h2>
                                    <p className="text-white text-lg md:text-xl">
                                        Chat live now, free forever, Essential preview unlocked for a limited time.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl transition-shadow flex flex-col h-[650px] md:h-[750px]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl md:text-2xl font-bold text-white">AIHR Free</h3>
                                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                                        </div>
                                        <p className="text-white text-sm md:text-base mb-4">Live Assistant · 50 messages / week</p>
                                        <div className="flex-1 rounded-2xl overflow-hidden">
                                            <AIHRChat compact />
                                            {/* <iframe
											src="https://www.chatbase.co/V5_sne4WDBbABvwxyLpl3/help"
											title="AIHR Free Chatbot"
											className="w-full h-full border-0"
											allow="microphone"
										/> */}
                                        </div>
                                    </div>

                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl transition-shadow flex flex-col h-[650px] md:h-[750px] relative">
                                        <div className="absolute top-4 right-4 bg-amber-300/20 border border-amber-300/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            Try Premium Free
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">AIHR Essential</h3>
                                        <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-4">
                                            <iframe
                                                allow="microphone"
                                                src="https://www.chatbase.co/chatbot-iframe/X9oUsKqo6TCzrGIhDtUMY"
                                                width="100%"
                                                style={{ height: "100%", }}
                                            // frameborder="0"
                                            ></iframe>
                                            {/* <iframe
                                                src="https://www.chatbase.co/V5_sne4WDBbABvwxyLpl3/help"
                                                title="AIHR Essential Chatbot"
                                                className="w-full h-full border-0"
                                                allow="microphone"
                                            /> */}
                                        </div>
                                        <Link
                                            href="/membership"
                                            className="w-full bg-amber-300 hover:bg-amber-400 text-slate-900 rounded-xl py-3 text-sm font-bold transition-all text-center"
                                        >
                                            Subscribe to Save and Unlock Access
                                        </Link>
                                    </div>

                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl transition-opacity flex flex-col h-[650px] md:h-[750px] justify-center items-center text-center opacity-80 hover:opacity-95">
                                        <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-white/60 text-2xl mb-4">
                                            🔒
                                        </div>
                                        <h3 className="text-lg md:text-2xl font-bold text-white mb-2">AIHR Professional</h3>
                                        <p className="text-white text-sm md:text-base mb-6">Coming Soon</p>
                                        <p className="text-white text-sm md:text-base mb-6">S$11,988 /yr</p>
                                        <p className="text-white text-sm md:text-base leading-relaxed mb-8">
                                            AIHR Pro+ chatbot, two HR audits per year, premium policy packs, 25% off HCCS consultancy fees,
                                            built for companies with 20-99 staff.
                                        </p>
                                        <Link
                                            href="/membership"
                                            className="w-full bg-amber-300 hover:bg-amber-400 text-slate-900 rounded-lg py-3 text-sm font-semibold transition-all text-center"
                                        >
                                            View Plans
                                        </Link>
                                    </div>

                                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl transition-opacity flex flex-col h-[650px] md:h-[750px] justify-center items-center text-center opacity-80 hover:opacity-95">
                                        <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-white/60 text-2xl mb-4">
                                            👑
                                        </div>
                                        <h3 className="text-lg md:text-2xl font-bold text-white mb-2">AIHR Strategic</h3>
                                        <p className="text-white text-sm md:text-base mb-6">Coming Soon</p>
                                        <p className="text-white text-sm md:text-base mb-6">S$17,988 /yr</p>
                                        <p className="text-white text-sm md:text-base leading-relaxed mb-8">
                                            Widest AI knowledge base, team and organisation portal, dedicated onboarding, 30% off HCCS
                                            consultancy fees, built for companies with 100+ staff.
                                        </p>
                                        <Link
                                            href="/membership"
                                            className="w-full bg-amber-300 hover:bg-amber-400 text-slate-900 rounded-lg py-3 text-sm font-semibold transition-all text-center"
                                        >
                                            View Plans
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <Link
                                        href="/member-portal"
                                        className="flex items-center gap-3 bg-gradient-to-r from-amber-300 to-amber-500 hover:shadow-2xl hover:shadow-amber-300/40 text-slate-900 rounded-2xl px-8 md:px-12 py-4 md:py-5 font-bold text-base md:text-lg transition-all transform hover:scale-105"
                                    >
                                        Try Our Chatbot With the Full Experience
                                        <span aria-hidden>→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
