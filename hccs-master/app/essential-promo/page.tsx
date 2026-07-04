import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Essential Promo Payment | HCCS",
    description:
        "Pay for HCCS Essential monthly or annual promotional plans via bank transfer or PayNow, then submit receipt via WhatsApp.",
};

const WHATSAPP_NUMBER = "+65 9436 2866";
const WHATSAPP_LINK = "https://wa.me/6594362866";
const WHATSAPP_PREFILL =
    "https://wa.me/6594362866?text=Hi%20HCCS%2C%20I%20have%20made%20payment%20for%20the%20Essential%20promotion.%20I%20am%20sending%20my%20receipt%20now.";

const BANK_ACCOUNT_NAME = "Human Capital Consulting & Services (Spore) Pte Ltd";
const BANK_ACCOUNT_NUMBER = "UOB Account 657-377-005-3";

export default function EssentialPromoPage() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-14">
            <section className="text-center mb-10">
                <p className="inline-flex items-center rounded-full bg-[#d4a84b]/10 text-[#0d1f35] text-sm font-semibold px-3 py-1 mb-4">
                    ESSENTIAL PROMOTION PAYMENT
                </p>
                <h1 className="text-5xl font-extrabold text-gray-900 mb-3">Essential Plan Promotion</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Choose your Essential promotional plan, make payment by bank transfer or PayNow, then send your receipt to us on WhatsApp for activation.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <article className="rounded-2xl border border-[#d4a84b]/45 bg-[#F8F5EC] p-6 shadow-sm">
                    <p className="text-sm font-semibold text-[#b8902f] mb-2">MONTHLY PROMO</p>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Essential Monthly Intro Offer</h2>
                    <p className="text-4xl font-extrabold text-[#b8902f] mb-1">S$199/month</p>
                    <p className="text-base text-gray-600 mb-4">First 3 months, then S$599/month.</p>
                    <ul className="text-base text-gray-700 space-y-2">
                        <li>• Convert to a <strong>1 year annual plan</strong> within 30 days for additional <strong>3 months free</strong></li>
                        <li>• Activation after payment receipt is verified</li>
                        <li>• Quote reference: Essential Monthly Promo</li>
                    </ul>
                </article>

                <article className="rounded-2xl border border-[#d4a84b]/40 bg-[#F8F5EC] p-6 shadow-sm">
                    <p className="text-sm font-semibold text-[#1a3a52] mb-2">2-YEAR PROMO</p>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Essential 2-Year Offer</h2>
                    <p className="text-4xl font-extrabold text-[#1a3a52] mb-1">S$11,476 / 2 years</p>
                    <p className="text-base text-gray-600 mb-4">Second year includes S$500 off.</p>
                    <ul className="text-base text-gray-700 space-y-2">
                        <li>• Covers 2 full years of the Essential plan</li>
                        <li>• Activation after payment receipt is verified</li>
                        <li>• Quote reference: Essential 2-Year Promo</li>
                    </ul>
                </article>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 mb-8 shadow-sm">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">How To Pay</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Option 1: Bank Transfer</h3>
                        <div className="space-y-2 text-base text-gray-700">
                            <p>
                                <span className="font-semibold text-gray-900">Account Name:</span> {BANK_ACCOUNT_NAME}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-900">Account Number:</span> {BANK_ACCOUNT_NUMBER}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Option 2: PayNow</h3>
                        <div className="space-y-2 text-base text-gray-700">
                            <p>
                                <span className="font-semibold text-gray-900">PayNow to Phone:</span> {WHATSAPP_NUMBER}
                            </p>
                            <p>Use your company name as payment reference if possible.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-7 rounded-xl border border-[#e5e0d2] bg-[#F8F5EC] p-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">After Payment</h3>
                    <ol className="list-decimal pl-5 text-base text-gray-700 space-y-2">
                        <li>Take a screenshot or photo of your payment receipt.</li>
                        <li>Send it to us on WhatsApp at {WHATSAPP_NUMBER}.</li>
                        <li>Include your company name, contact person, and selected plan (Monthly or 2-Year).</li>
                    </ol>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <a
                            href={WHATSAPP_PREFILL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-[#1a3a52] hover:bg-[#0d1f35] text-white text-base font-semibold px-5 py-2.5 transition-colors"
                        >
                            Send Receipt via WhatsApp
                        </a>
                        <a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-[#1a3a52] text-[#1a3a52] hover:bg-[#F8F5EC] text-base font-semibold px-5 py-2.5 transition-colors"
                        >
                            Open WhatsApp Chat
                        </a>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-3">
                <Link
                    href="/membership"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-semibold px-5 py-2.5 transition-colors"
                >
                    Back to Membership
                </Link>
                <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-black text-base font-semibold px-5 py-2.5 transition-colors"
                >
                    Contact Us
                </Link>
            </div>
        </div>
    );
}
