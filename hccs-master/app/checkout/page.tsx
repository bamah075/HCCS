"use client";

export const dynamic = "force-dynamic";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type BillingCycle = "monthly" | "annual";

const PLAN_ROWS_BY_ID: Record<number, { plan: string; label: string; price: number; cycle: BillingCycle; kind?: "subscription" | "one-time" }> = {
  1: { plan: "essential", label: "Essential", price: 599, cycle: "monthly" },
  2: { plan: "essential", label: "Essential", price: 5988, cycle: "annual" },
  3: { plan: "professional", label: "Professional", price: 999, cycle: "monthly" },
  4: { plan: "professional", label: "Professional", price: 11988, cycle: "annual" },
  5: { plan: "strategic", label: "Strategic", price: 1499, cycle: "monthly" },
  6: { plan: "strategic", label: "Strategic", price: 17988, cycle: "annual" },
  7: { plan: "essential-bundle", label: "Essential Bundle", price: 997, cycle: "monthly" },
  8: { plan: "expert-advisory", label: "Expert Advisory", price: 1500, cycle: "annual", kind: "one-time" },
};

const DEFAULT_PLAN_ID_BY_KEY: Record<string, Record<BillingCycle, number>> = {
  essential: { monthly: 1, annual: 2 },
  professional: { monthly: 3, annual: 4 },
  strategic: { monthly: 5, annual: 6 },
  "essential-bundle": { monthly: 7, annual: 7 },
  "expert-advisory": { monthly: 8, annual: 8 },
};

function toAirwallexClientEnv(env?: string): "demo" | "prod" {
  return env === "prod" ? "prod" : "demo";
}

type CheckoutIntentState = {
  intentId: string;
  clientSecret: string;
  currency: string;
  countryCode: string;
};

function CheckoutContent() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const statusPollRef = useRef<number | null>(null);
  const handledResultRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan") ?? "essential";
  const billing = searchParams.get("billing") === "monthly" ? "monthly" : "annual";
  const planIdParam = Number(searchParams.get("planId") || "");
  const fallbackPlanId = DEFAULT_PLAN_ID_BY_KEY[plan]?.[billing] ?? DEFAULT_PLAN_ID_BY_KEY.essential.annual;
  const planId = Number.isFinite(planIdParam) && PLAN_ROWS_BY_ID[planIdParam] ? planIdParam : fallbackPlanId;
  const planInfo = PLAN_ROWS_BY_ID[planId] ?? PLAN_ROWS_BY_ID[2];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const intentStorageKey = `checkout:intent:${planId}:${planInfo.cycle}`;

    const readStoredIntent = (): CheckoutIntentState | null => {
      const rawValue = window.sessionStorage.getItem(intentStorageKey);

      if (!rawValue) {
        return null;
      }

      try {
        const parsed = JSON.parse(rawValue) as Partial<CheckoutIntentState>;

        if (!parsed.intentId || !parsed.clientSecret || !parsed.currency) {
          window.sessionStorage.removeItem(intentStorageKey);
          return null;
        }

        return {
          intentId: parsed.intentId,
          clientSecret: parsed.clientSecret,
          currency: parsed.currency,
          countryCode: parsed.countryCode ?? "SG",
        };
      } catch {
        window.sessionStorage.removeItem(intentStorageKey);
        return null;
      }
    };

    const storeIntent = (intent: CheckoutIntentState) => {
      window.sessionStorage.setItem(intentStorageKey, JSON.stringify(intent));
    };

    const clearStoredIntent = () => {
      window.sessionStorage.removeItem(intentStorageKey);
    };

    const stopStatusPolling = () => {
      if (statusPollRef.current !== null) {
        window.clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };

    const handleCheckoutError = (message: string, details?: unknown) => {
      if (handledResultRef.current) {
        return;
      }

      handledResultRef.current = true;
      stopStatusPolling();
      clearStoredIntent();

      if (details !== undefined) {
        console.error("[Checkout] Payment error:", details);
      }

      setError(message);
    };

    const handleCheckoutSuccess = async (accessToken: string, intentId?: string) => {
      if (handledResultRef.current) {
        return;
      }

      handledResultRef.current = true;
      stopStatusPolling();
      clearStoredIntent();

      console.log("[Checkout] Handling successful payment. Plan:", planInfo.plan, "planId:", planId);

      if (planInfo.plan === "expert-advisory") {
        window.location.href = "https://calendly.com/calendar-hccs/expert-advisory";
        return;
      }

      try {
        const upgradeRes = await fetch("/api/checkout/sandbox-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ planId, intentId }),
        });
        const upgradeData = await upgradeRes.json();
        console.log("[Checkout] Upgrade response:", upgradeRes.status, upgradeData);
        if (!upgradeRes.ok) {
          handledResultRef.current = false;
          setError(upgradeData?.error || "Payment succeeded, but membership upgrade failed.");
          return;
        }

        window.location.href = "/member-portal?upgraded=1";
      } catch (upgradeError) {
        handledResultRef.current = false;
        console.error("[Checkout] Tier upgrade error:", upgradeError);
        setError("Payment succeeded, but membership upgrade failed.");
      }
    };

    const fetchIntentStatus = async (intentId: string, accessToken: string) => {
      const statusRes = await fetch(`/api/checkout?intentId=${encodeURIComponent(intentId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!statusRes.ok) {
        console.error("[Checkout] Failed to poll payment status:", statusRes.status);
        return null;
      }

      return statusRes.json();
    };

    const startStatusPolling = (intentId: string, accessToken: string) => {
      if (!intentId || handledResultRef.current || statusPollRef.current !== null) {
        return;
      }

      const pollStatus = async () => {
        try {
          const statusData = await fetchIntentStatus(intentId, accessToken);

          if (!statusData) {
            return;
          }

          console.log("[Checkout] Polled payment status:", statusData.status, statusData.latest_payment_attempt_status);

          if (statusData.status === "SUCCEEDED") {
            await handleCheckoutSuccess(accessToken, intentId);
            return;
          }

          if (["FAILED", "CANCELLED"].includes(statusData.status)) {
            handleCheckoutError("Payment failed. Please check your details and try again.", statusData);
          }
        } catch (pollError) {
          console.error("[Checkout] Payment status poll error:", pollError);
        }
      };

      void pollStatus();
      statusPollRef.current = window.setInterval(() => {
        void pollStatus();
      }, 2000);
    };

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const currentCheckoutPath = `/checkout?${searchParams.toString()}`;

        if (!session) {
          router.replace(`/login?mode=signin&next=${encodeURIComponent(currentCheckoutPath)}`);
          return;
        }

        setAuthChecked(true);

        const accessToken = session?.access_token ?? "";
        let checkoutIntent = readStoredIntent();

        if (checkoutIntent) {
          const existingStatus = await fetchIntentStatus(checkoutIntent.intentId, accessToken);

          if (existingStatus?.status === "SUCCEEDED") {
            await handleCheckoutSuccess(accessToken, checkoutIntent.intentId);
            return;
          }

          if (existingStatus && ["FAILED", "CANCELLED"].includes(existingStatus.status)) {
            clearStoredIntent();
            checkoutIntent = null;
          }
        }

        if (!checkoutIntent) {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ plan, planId, billing_cycle: planInfo.cycle }),
          });
          const data: {
            intent_id: string;
            client_secret: string;
            currency: string;
            country_code?: string;
            gateway?: string;
            flow?: "inpage" | "redirect";
            error?: string;
          } | null = await res.json();

          if (res.status === 401) {
            router.replace(`/login?mode=signin&next=${encodeURIComponent(currentCheckoutPath)}`);
            return;
          }

          if (res.status === 403) {
            router.replace("/login?mode=register");
            return;
          }

          if (!data) {
            setError("Checkout service returned an empty response.");
            setLoading(false);
            return;
          }

          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }

          // Redirect-flow gateways (e.g. HitPay): the gateway returns a hosted-
          // checkout URL in client_secret. We don't mount an in-page SDK —
          // just navigate the browser there. HitPay sends the user back to
          // /checkout/return?planId=... when they're done.
          if (data.flow === "redirect" && data.client_secret) {
            window.location.href = data.client_secret;
            return;
          }

          checkoutIntent = {
            intentId: data.intent_id,
            clientSecret: data.client_secret,
            currency: data.currency,
            countryCode: data.country_code ?? "SG",
          };
          storeIntent(checkoutIntent);
        }

        // In-page flow (Airwallex): mount the Drop-in element.
        const awx = await import("@airwallex/components-sdk");
        await awx.init({
          env: toAirwallexClientEnv(process.env.NEXT_PUBLIC_AIRWALLEX_ENV),
        });

        const element = await awx.createElement("dropIn", {
          intent_id: checkoutIntent.intentId,
          client_secret: checkoutIntent.clientSecret,
          currency: checkoutIntent.currency,
          country_code: checkoutIntent.countryCode,
          methods: ["card", "alipaycn", "pay_now"],
        });

        startStatusPolling(checkoutIntent.intentId, accessToken);

        element.on("clickConfirmButton", () => {
          console.log("[Checkout] Confirm button clicked. Starting payment status polling.");
          startStatusPolling(checkoutIntent.intentId, accessToken);
        });

        element.on("success", async (event) => {
          console.log("[Checkout] Payment success event fired:", event.detail);
          await handleCheckoutSuccess(accessToken, checkoutIntent.intentId);
        });

        element.on("error", (err: unknown) => {
          handleCheckoutError("Payment failed. Please check your details and try again.", err);
        });

        if (cardRef.current) {
          element.mount(cardRef.current);
        }


      } catch (err) {
        console.error("Checkout init error:", err);
        setError("Failed to initialize checkout. Please try again.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      stopStatusPolling();
    };
  }, [billing, plan, planId, planInfo.cycle, planInfo.plan, router, searchParams]);

  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/membership"
          className="text-sm text-[#1a3a52] hover:text-[#0d1f35] mb-6 inline-block"
        >
          ← Back to plans
        </Link>

        <div className="mb-5 rounded-xl bg-[#FFF8E1] border border-[#E2C57A]/60 px-4 py-3 text-sm text-[#5C4500] flex items-start gap-3">
          <span aria-hidden className="text-lg leading-none mt-0.5">⚡</span>
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Card checkout is temporarily down for KYC.</p>
            <p className="text-xs leading-relaxed">
              You can still pay by PayNow / bank transfer right now —{" "}
              <Link
                href={`/checkout/manual?planId=${planId}`}
                className="font-semibold underline decoration-2 underline-offset-2 hover:text-[#3F2F00]"
              >
                use the manual checkout
              </Link>{" "}
              and we&apos;ll activate within 1 business day.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0d1f35] text-white px-6 py-5">
            <h1 className="text-xl font-bold mb-1">Complete Your Order</h1>
            <p className="text-[#e8c97a] text-sm">HCCS AIHR Platform</p>
          </div>

          {/* Order summary */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{planInfo.label} {planInfo.kind === "one-time" ? "Session" : "Plan"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {planInfo.kind === "one-time"
                    ? "One-time payment"
                    : `${planInfo.cycle === "annual" ? "Annual" : "Monthly"} subscription · auto-renews`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">S${planInfo.price.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{planInfo.kind === "one-time" ? "one-time" : planInfo.cycle === "annual" ? "/ year" : "/ month"}</p>
              </div>
            </div>

            <ul className="mt-4 space-y-1">
              {(planInfo.plan === "expert-advisory"
                ? [
                    "In-depth HR strategy review",
                    "Compliance audit",
                    "Customized action plan",
                    "Priority booking",
                    "60-minute expert advisory session",
                  ]
                : [
                    "AI HR Chatbot (enhanced)",
                    "Full HR templates & SOPs library",
                    "Unlimited Compliance Scans",
                    "Video Insights Library",
                    "25% off consultancy services",
                  ]).map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-[#1a3a52]">✓</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment form */}
          <div className="px-6 py-6">
            {/* {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#1a3a52] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">
                  Preparing secure checkout…
                </span>
              </div>
            )} */}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
                {error}
                <br />
                <Link
                  href="/contact"
                  className="underline text-red-600 hover:text-red-800 mt-1 inline-block"
                >
                  Contact us for assistance →
                </Link>
              </div>
            )}

            {loading && !error && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#1a3a52] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">
                  {!authChecked ? "Checking your account..." : "Preparing secure checkout..."}
                </span>
              </div>
            )}

            {/* Airwallex dropIn — card + Alipay */}
            <div ref={cardRef} className={loading ? "hidden" : "min-h-[400px]"} />
            
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secured by Airwallex · SSL encrypted · Singapore entity
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#1a3a52] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
