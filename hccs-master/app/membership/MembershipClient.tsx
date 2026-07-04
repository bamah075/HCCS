"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

type BillingCycle = "monthly" | "annual";
type PlanKey = "essential" | "professional" | "strategic";

const SUBSCRIPTION_PLAN_ROWS: Record<PlanKey, Partial<Record<BillingCycle, { id: number; price: number }>>> = {
  essential: {
    monthly: { id: 1, price: 599 },
    annual: { id: 2, price: 5988 },
  },
  professional: {
    monthly: { id: 3, price: 999 },
    annual: { id: 4, price: 11988 },
  },
  strategic: {
    monthly: { id: 5, price: 1499 },
    annual: { id: 6, price: 17988 },
  },
};

function formatCurrency(value: number): string {
  return `S$${value.toLocaleString()}`;
}

function extractPlanKey(href: string, name?: string): PlanKey | null {
  const query = href.includes("?") ? href.split("?")[1] : "";
  const plan = new URLSearchParams(query).get("plan");
  if (plan === "essential" || plan === "professional" || plan === "strategic") {
    return plan;
  }
  // Fallback: derive the key from the plan name so locale-driven cards that
  // still point at /contact (Pro + Strategic historically) get wired to
  // /checkout. The Free tier name doesn't match any paid key so it stays
  // pointed at /member-portal.
  const normalised = (name ?? "").trim().toLowerCase();
  if (normalised === "essential" || normalised.startsWith("essential ")) return "essential";
  if (normalised === "professional" || normalised.startsWith("professional ")) return "professional";
  if (normalised === "strategic" || normalised.startsWith("strategic ")) return "strategic";
  return null;
}

export default function MembershipClient() {
  const { t, lang } = useLang();
  const m = t.membership;
  const [billing, setBilling] = useState<"monthly" | "annually">("annually");

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{m.title}</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{m.desc}</p>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-14">
        <span className={`text-sm font-medium ${billing === "monthly" ? "text-gray-900" : "text-gray-400"}`}>
          {lang === "zh" ? "每个月" : "Monthly"}
        </span>
        <button
          onClick={() => setBilling(billing === "monthly" ? "annually" : "monthly")}
          className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
            billing === "annually" ? "bg-[#1a3a52]" : "bg-gray-300"
          }`}
          aria-label="Toggle billing period"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              billing === "annually" ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billing === "annually" ? "text-gray-900" : "text-gray-400"}`}>
          {lang === "zh" ? "每年" : "Annually"}
        </span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {m.plans.map((plan) => {
          const planKey = extractPlanKey(plan.href, plan.name);
          const isHighlight = planKey === "essential";

          const cycleKey: BillingCycle = billing === "annually" ? "annual" : "monthly";
          const csvPrice = planKey ? SUBSCRIPTION_PLAN_ROWS[planKey]?.[cycleKey]?.price : undefined;
          const csvPlanId = planKey ? SUBSCRIPTION_PLAN_ROWS[planKey]?.[cycleKey]?.id : undefined;

          // plan.price is the annual price (e.g. "S$5,988")
          const rawPrice = plan.price.replace(/[^0-9.]/g, "");
          const annualNum = parseFloat(rawPrice);
          const monthlyNum = isNaN(annualNum) ? null : Math.round(annualNum / 12);

          const isFree = plan.price === "S$0" || plan.price === "Free";
          const displayPrice = isFree
            ? (lang === "zh" ? "免费" : "Free")
            : csvPrice !== undefined
            ? formatCurrency(csvPrice)
            : billing === "annually"
            ? plan.price
            : monthlyNum !== null
            ? `S$${monthlyNum.toLocaleString()}`
            : plan.price;
          const displayPeriod = isFree
            ? ""
            : lang === "zh"
            ? (billing === "annually" ? "年" : "月")
            : billing === "annually"
            ? "/ year"
            : "/ month";

          // Pro + Strategic are now sellable too: any plan with a resolvable
          // planKey + planId goes through /checkout regardless of what the
          // locale's plan.href says (which may still read "/contact" for
          // historical reasons).
          const checkoutHref =
            planKey && csvPlanId
              ? `/checkout?plan=${planKey}&planId=${csvPlanId}&billing=${cycleKey}`
              : plan.href;

          // Override CTA copy for paid tiers so the button reads as a buy
          // action even if the locale still says "Contact for Pricing".
          const ctaText = planKey && csvPlanId ? (lang === "zh" ? "立即开始" : "Get Started") : plan.cta;

          return (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                isHighlight
                  ? "border-[#d4a84b] bg-[#F8F5EC] shadow-lg ring-2 ring-[#d4a84b]"
                  : "border-gray-200 bg-white shadow-sm"
              }`}
            >
              {isHighlight && (
                <span className="text-xs font-semibold text-[#1a3a52] bg-[#d4a84b]/10 rounded-full px-3 py-1 self-start mb-3">
                  {m.mostPopular}
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">{plan.target}</p>
              <div className="mb-4">
                <span className="text-3xl font-extrabold text-gray-900">{displayPrice}</span>
                {displayPeriod && (
                  <span className="text-sm text-gray-500 ml-1">{displayPeriod}</span>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[#1a3a52] mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={checkoutHref}
                className={`text-center py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isHighlight
                    ? "bg-[#1a3a52] text-white hover:bg-[#0d1f35]"
                    : "border border-[#1a3a52] text-[#1a3a52] hover:bg-[#F8F5EC]"
                }`}
              >
                {ctaText}
              </Link>
            </div>
          );
        })}
      </section>

      {/* Essential promotional offer — context-sensitive per billing cycle */}
      {(() => {
        const promo = m.promo;
        const monthlyPromoId = 7;
        const annualEssentialId = SUBSCRIPTION_PLAN_ROWS.essential.annual?.id;
        if (billing === "monthly") {
          return (
            <div className="mb-16 rounded-2xl border-2 border-[#d4a84b] bg-gradient-to-r from-[#F8F5EC] to-[#F8F5EC] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#b8902f] bg-[#d4a84b]/20 rounded-full px-3 py-1">
                    {promo.monthlyBadge}
                  </span>
                  <span className="text-xs text-[#b8902f] font-medium">{promo.monthlyLabel}</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">{promo.monthlyTitle}</h3>
                <p className="text-sm text-gray-600 max-w-lg">{promo.monthlyDesc}</p>
              </div>
              <div className="flex flex-col items-center sm:items-end gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500">{promo.monthlyThen}</p>
                  <p className="text-3xl font-extrabold text-[#b8902f]">S$199<span className="text-base font-semibold">{lang === "zh" ? "/月" : "/mo"}</span></p>
                  <p className="text-xs text-[#b8902f] font-semibold">{promo.monthlySavings}</p>
                </div>
                <Link
                  href={`/checkout?plan=essential&planId=${monthlyPromoId}&billing=monthly&promo=intro3`}
                  className="bg-[#d4a84b] hover:bg-[#b8902f] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                >
                  {promo.monthlyCta}
                </Link>
              </div>
            </div>
          );
        }
        // Annual billing
        return (
          <div className="mb-16 rounded-2xl border-2 border-[#d4a84b]/55 bg-gradient-to-r from-[#F8F5EC] to-teal-50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[#0d1f35] bg-[#d4a84b]/20 rounded-full px-3 py-1">
                  {promo.annualBadge}
                </span>
                <span className="text-xs text-[#1a3a52] font-medium">{promo.annualLabel}</span>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">{promo.annualTitle}</h3>
              <p className="text-sm text-gray-600 max-w-lg">{promo.annualDesc}</p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-gray-500">{promo.annualPlanLabel}</p>
                <p className="text-3xl font-extrabold text-[#1a3a52]">{promo.annualHighlight}</p>
                <p className="text-xs text-[#1a3a52] font-semibold">{promo.annualSubtitle}</p>
              </div>
              <Link
                href={`/checkout?plan=essential&planId=${annualEssentialId}&billing=annual&promo=free3`}
                className="bg-[#1a3a52] hover:bg-[#0d1f35] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                {promo.annualCta}
              </Link>
            </div>
          </div>
        );
      })()}

      <section>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">{m.faqTitle}</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {m.faqs.map((faq) => (
            <div key={faq.q} className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
