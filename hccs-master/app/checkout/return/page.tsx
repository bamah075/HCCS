"use client";

export const dynamic = "force-dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

/**
 * Post-redirect landing for hosted-checkout gateways (HitPay).
 *
 * Flow when the user arrives here:
 *   1. Read planId (we put it in the redirect_url) + payment id (HitPay adds it).
 *   2. POST /api/checkout/sandbox-success → finalize subscription / tier.
 *   3. Redirect to /member-portal?upgraded=1 on success.
 *
 * The HitPay webhook also calls finalizePayment server-side (signed), so this
 * page mostly acts as the user-visible "confirming…" step. finalize is
 * idempotent on gateway_payment_id, so doing it from both paths is safe.
 */
function ReturnInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "ok" | "pending" | "error">("loading");
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const planId = Number(searchParams.get("planId") || "");
        // HitPay redirect_url query: payment_id, payment_request_id, status, reference_number, hmac
        const intentId =
            searchParams.get("payment_request_id") ||
            searchParams.get("reference") ||
            searchParams.get("payment_id") ||
            null;
        const gatewayStatus = (searchParams.get("status") || "").toLowerCase();

        if (!planId) {
            setStatus("error");
            setErrMsg("Missing plan information on return. If your payment went through, please refresh the member portal to see your subscription.");
            return;
        }

        // Hard-fail states: user cancelled / payment declined.
        if (gatewayStatus === "failed" || gatewayStatus === "cancelled") {
            setStatus("error");
            setErrMsg(`Payment was ${gatewayStatus}. You can try again from the membership page.`);
            return;
        }

        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // No session — webhook should still finalize, but we can't
                // call sandbox-success without auth. Send user to login;
                // their tier will update once the webhook lands.
                router.replace("/login?next=" + encodeURIComponent("/member-portal?upgraded=1"));
                return;
            }

            try {
                const res = await fetch("/api/checkout/sandbox-success", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ planId, intentId }),
                });
                const data = await res.json();

                if (res.ok && data.ok) {
                    setStatus("ok");
                    setTimeout(() => router.replace("/member-portal?upgraded=1"), 800);
                    return;
                }

                if (res.status === 402) {
                    setStatus("error");
                    setErrMsg(data.error || "Payment did not complete.");
                    return;
                }

                // Most likely: payment isn't reflected yet (webhook still in
                // flight). Show a soft "processing" state — user can refresh
                // the portal in a moment.
                setStatus("pending");
                setErrMsg(data.error || "Payment received — finalizing your subscription. This usually takes under a minute.");
            } catch (e) {
                setStatus("error");
                setErrMsg((e as Error).message ?? "Unexpected error finalizing payment.");
            }
        })();
    }, [router, searchParams]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
                {status === "loading" && (
                    <>
                        <div className="w-10 h-10 border-4 border-[#1a3a52] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                        <h1 className="text-xl font-semibold text-gray-900">Finalizing your payment…</h1>
                        <p className="text-sm text-gray-500 mt-2">Hang tight, this usually takes a couple of seconds.</p>
                    </>
                )}
                {status === "ok" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 text-2xl flex items-center justify-center mx-auto mb-4">✓</div>
                        <h1 className="text-xl font-semibold text-gray-900">Payment confirmed</h1>
                        <p className="text-sm text-gray-500 mt-2">Redirecting you to your member portal…</p>
                    </>
                )}
                {status === "pending" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 text-2xl flex items-center justify-center mx-auto mb-4">⌛</div>
                        <h1 className="text-xl font-semibold text-gray-900">Almost done</h1>
                        <p className="text-sm text-gray-600 mt-2">{errMsg}</p>
                        <Link href="/member-portal" className="mt-5 inline-block bg-[#1a3a52] hover:bg-[#0d1f35] text-white text-sm font-semibold px-5 py-2 rounded-lg">
                            Go to member portal
                        </Link>
                    </>
                )}
                {status === "error" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 text-2xl flex items-center justify-center mx-auto mb-4">✕</div>
                        <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
                        <p className="text-sm text-gray-600 mt-2">{errMsg}</p>
                        <div className="mt-5 flex gap-3 justify-center">
                            <Link href="/membership" className="bg-[#1a3a52] hover:bg-[#0d1f35] text-white text-sm font-semibold px-5 py-2 rounded-lg">
                                Back to plans
                            </Link>
                            <Link href="/member-portal" className="border border-gray-300 hover:bg-gray-50 text-sm font-semibold px-5 py-2 rounded-lg">
                                Member portal
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function CheckoutReturnPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#1a3a52] border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <ReturnInner />
        </Suspense>
    );
}
