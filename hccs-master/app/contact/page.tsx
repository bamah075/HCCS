"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

const industries = [
  "Retail","F&B","Construction","Manufacturing","Trading","Services","Recruitment",
  "Technology","Finance","Healthcare","Education","Logistics","Energy","Real Estate",
  "Hospitality","Automotive","Aerospace","Agriculture","Pharma & Biotech","Consumer Goods",
  "IT & Software","Telecommunications","Media & Entertainment","Consulting","Legal",
  "Accounting","Insurance","Banking","Investment","Import & Export","Wholesale","Mining",
  "Oil & Gas","Utilities","Transportation","Marine & Shipping","Aviation","Tourism",
  "Beauty & Wellness","Fashion","Publishing","Advertising","Public Relations","Non-Profit",
  "Government","Other",
];

const servicesOfInterest = [
  "EP/PR Application & Renewals","Permanent Residency","EntrePass & Startup",
  "HR Compliance & Advisory","Job Redesign & Quota Planning","Fractional HR Business Partner",
  "Workforce Planning & Org Design","AI HR","Learning & Development",
  "Performance & Culture","Membership Enquiry","Other",
];

export default function ContactPage() {
  const { t } = useLang();
  const c = t.contact;
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "",
    industry: "", service: "", message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || c.errorFallback);
      return;
    }

    setSent(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Info */}
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{c.title}</h1>
        <p className="text-gray-600 mb-8">{c.subtitle}</p>

        <div className="space-y-5">
          <div className="flex gap-4">
            <span className="text-2xl">📧</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{c.emailLabel}</p>
              <a href="mailto:enquiry@hccs.sg" className="text-[#1a3a52] hover:underline text-sm">
                enquiry@hccs.sg
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-2xl">📞</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{c.phoneLabel}</p>
              <a href="tel:+6594362866" className="text-[#1a3a52] hover:underline text-sm">
                +65 9436-2866
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{c.whatsappLabel}</p>
              <a
                href="https://wa.me/6594362866"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a3a52] hover:underline text-sm"
              >
                +65 9436-2866
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="text-2xl">📍</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{c.addressLabel}</p>
              <p className="text-sm text-gray-600">
                10 Anson Road #05-01<br />
                International Plaza<br />
                Singapore 079903
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">{c.bilingualNote}</p>
          <p className="text-sm text-gray-600">{c.bilingualDetail}</p>
        </div>
      </div>

      {/* Form */}
      <div>
        {sent ? (
          <div className="bg-[#F8F5EC] border border-[#e5e0d2] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{c.successTitle}</h2>
            <p className="text-sm text-gray-600">{c.successMessage}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-5"
          >
            <h2 className="text-xl font-bold text-gray-900">{c.formTitle}</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{c.fullName}</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                  placeholder={c.namePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{c.companyName}</label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                  placeholder={c.companyPlaceholder}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{c.email}</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                  placeholder={c.emailPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{c.phone}</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b]"
                  placeholder={c.phonePlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{c.industry}</label>
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b] bg-white"
              >
                <option value="">{c.industryDefault}</option>
                {industries.map((ind) => {
                  const labels = (c as { industries?: Record<string,string> }).industries ?? {};
                  return <option key={ind} value={ind}>{labels[ind] ?? ind}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{c.service}</label>
              <select
                name="service"
                value={form.service}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b] bg-white"
              >
                <option value="">{c.serviceDefault}</option>
                {servicesOfInterest.map((svc) => {
                  const labels = (c as { services?: Record<string,string> }).services ?? {};
                  return <option key={svc} value={svc}>{labels[svc] ?? svc}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{c.message}</label>
              <textarea
                name="message"
                required
                value={form.message}
                onChange={handleChange}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a84b] resize-none"
                placeholder={c.messagePlaceholder}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#1a3a52] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0d1f35] transition-colors disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
                <path d="m21.854 2.147-10.94 10.939"/>
              </svg>
              {loading ? c.submitting : c.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
