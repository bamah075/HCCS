// Central source of truth for subscription plan metadata.
// Use this from BOTH the gateway-specific code and the membership UI so
// price / tier-id / duration changes happen in one place.

export type BillingCycle = "monthly" | "annual" | "one-time";
export type PlanKey = "essential" | "professional" | "strategic" | "essential-bundle" | "expert-advisory";

export interface Plan {
    /** Matches subscription_plan.id in the DB. */
    id: number;
    key: PlanKey;
    name: string;
    description: string;
    descriptor: string;
    /** Amount in major units (SGD dollars, not cents). */
    amount: number;
    currency: "SGD";
    cycle: BillingCycle;
    /** Maps to user_tier.id. Null for one-time products that don't change tier. */
    tierId: number | null;
    /** How long an active subscription lasts before ends_at. Null = lifetime / one-time. */
    durationDays: number | null;
    /** Tag this row as a promo so the success handler can apply special copy / analytics. */
    promo?: string;
}

export const PLANS: Record<number, Plan> = {
    1: {
        id: 1, key: "essential", name: "HCCS Essential Plan",
        description: "HCCS AIHR Essential Plan — Monthly Subscription",
        descriptor: "Essential Monthly",
        amount: 599, currency: "SGD", cycle: "monthly",
        tierId: 2, durationDays: 31,
    },
    2: {
        id: 2, key: "essential", name: "HCCS Essential Plan",
        description: "HCCS AIHR Essential Plan — Annual Subscription",
        descriptor: "Essential Annual",
        amount: 5988, currency: "SGD", cycle: "annual",
        tierId: 2, durationDays: 366,
    },
    3: {
        id: 3, key: "professional", name: "HCCS Professional Plan",
        description: "HCCS AIHR Professional Plan — Monthly Subscription",
        descriptor: "Professional Monthly",
        amount: 999, currency: "SGD", cycle: "monthly",
        tierId: 3, durationDays: 31,
    },
    4: {
        id: 4, key: "professional", name: "HCCS Professional Plan",
        description: "HCCS AIHR Professional Plan — Annual Subscription",
        descriptor: "Professional Annual",
        amount: 11988, currency: "SGD", cycle: "annual",
        tierId: 3, durationDays: 366,
    },
    5: {
        id: 5, key: "strategic", name: "HCCS Strategic Plan",
        description: "HCCS AIHR Strategic Plan — Monthly Subscription",
        descriptor: "Strategic Monthly",
        amount: 1499, currency: "SGD", cycle: "monthly",
        tierId: 4, durationDays: 31,
    },
    6: {
        id: 6, key: "strategic", name: "HCCS Strategic Plan",
        description: "HCCS AIHR Strategic Plan — Annual Subscription",
        descriptor: "Strategic Annual",
        amount: 17988, currency: "SGD", cycle: "annual",
        tierId: 4, durationDays: 366,
    },
    7: {
        id: 7, key: "essential-bundle", name: "HCCS Essential Bundle",
        description: "HCCS AIHR Essential Bundle — 3-Month Intro Offer",
        descriptor: "Essential Bundle",
        amount: 997, currency: "SGD", cycle: "monthly",
        tierId: 2, durationDays: 93, promo: "intro3",
    },
    8: {
        id: 8, key: "expert-advisory", name: "HCCS Expert Advisory",
        description: "HCCS Expert Advisory — 60-Minute Session",
        descriptor: "Expert Advisory",
        amount: 1500, currency: "SGD", cycle: "one-time",
        tierId: null, durationDays: null,
    },
};

export function getPlan(planId: number | string | null | undefined): Plan | null {
    const id = Number(planId);
    if (!Number.isFinite(id)) return null;
    return PLANS[id] ?? null;
}

export function resolvePlan(planKey: string, billingCycle: BillingCycle): Plan | null {
    const cycleMatch = billingCycle === "annual" ? "annual" : billingCycle === "monthly" ? "monthly" : "one-time";
    return Object.values(PLANS).find((p) => p.key === planKey && p.cycle === cycleMatch) ?? null;
}

/** Tier display names — kept here so we don't need a DB round-trip for upgrade UX copy. */
export const TIER_NAMES: Record<number, string> = {
    1: "Free",
    2: "Essential",
    3: "Professional",
    4: "Strategic",
};
