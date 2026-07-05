"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";

const industries = [
  "Retail","F&B","Construction","Manufacturing","Trading","Services","Recruitment",
  "Technology","Finance","Healthcare","Education","Logistics","Energy","Real Estate",
  "Hospitality","Automotive","Aerospace","Agriculture","Pharma & Biotech","Consumer Goods",
  "IT & Software","Telecommunications","Media & Entertainment","Consulting","Legal",
  "Accounting","Insurance","Banking","Investment","Import & Export","Wholesale","Mining",
  "Oil & Gas","Utilities","Transportation","Marine & Shipping","Aviation","Tourism",
  "Beauty & Wellness","Fashion","Publishing","Advertising","Non-Profit","Government","Other",
];

const companySizes = [
  "1–5 employees",
  "6–20 employees",
  "21–50 employees",
  "51–200 employees",
  "201–500 employees",
  "500+ employees",
];

export default function CompanyDetailsPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const cd = t.complianceScan.companyDetails;
  const steps = t.complianceScan.steps;
  const [qrId, setQrId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    industry: "",
    size: "",
    foreignWorkers: null as null | boolean,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.currentTarget.setCustomValidity("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInvalid = (e: React.InvalidEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.setCustomValidity(lang === "zh" ? "请填写此项" : "Please fill in this field.");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const id = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
    setQrId(id);
  }, []);

  const allFilled = form.name && form.email && form.company && form.industry && form.size && form.foreignWorkers !== null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("cs_company", JSON.stringify(form));
    if (qrId) {
      sessionStorage.setItem("cs_qr", qrId);
      router.push(`/compliance-scan/intro?id=${encodeURIComponent(qrId)}`);
      return;
    }

    router.push("/compliance-scan/intro");
  };

  const inputCls = "w-full border border-[#e5e0d2] bg-white rounded-lg px-4 py-2.5 text-sm text-[#0d1f35] placeholder:text-slate-400";
  const labelCls = "block text-xs font-semibold uppercase tracking-[0.16em] text-[#1a3a52] mb-1.5";

  return (
    <div className="min-h-screen bg-[#F8F5EC] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-display ${i === 0 ? "bg-[#0d1f35] text-[#d4a84b]" : "bg-white text-slate-400 border border-[#e5e0d2]"}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-6 ${i === 0 ? "bg-[#d4a84b]" : "bg-[#e5e0d2]"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_24px_60px_-32px_rgba(13,31,53,0.18)] border border-[#e5e0d2] p-8 sm:p-10">
          <p className="eyebrow">Step 1</p>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0d1f35] leading-tight mb-3">{cd.heading}</h1>
          <span className="rule-gold mb-5" />
          <p className="text-sm text-slate-600 mb-7 leading-relaxed">{cd.subheading}</p>

          <form onSubmit={handleNext} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>{cd.fullName} *</label>
                <input name="name" required value={form.name} onChange={handleChange} onInvalid={handleInvalid} placeholder="Jane Smith" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{cd.businessEmail} *</label>
                <input name="email" type="email" required value={form.email} onChange={handleChange} onInvalid={handleInvalid} placeholder="jane@company.com" className={inputCls} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>{cd.companyName} *</label>
                <input name="company" required value={form.company} onChange={handleChange} onInvalid={handleInvalid} placeholder="Acme Pte Ltd" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{cd.mobileNumber}</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+65 9123 4567" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>{cd.industryLabel} *</label>
              <select name="industry" required value={form.industry} onChange={handleChange} onInvalid={handleInvalid} className={inputCls}>
                <option value="">{cd.selectIndustry}</option>
                {industries.map((ind) => {
                  const labels = (cd as { industries?: Record<string,string> }).industries ?? {};
                  return <option key={ind} value={ind}>{labels[ind] ?? ind}</option>;
                })}
              </select>
            </div>

            <div>
              <label className={labelCls}>{cd.sizeLabel} *</label>
              <select name="size" required value={form.size} onChange={handleChange} onInvalid={handleInvalid} className={inputCls}>
                <option value="">{cd.selectSize}</option>
                {companySizes.map((s) => {
                  const labels = (cd as { sizes?: Record<string,string> }).sizes ?? {};
                  return <option key={s} value={s}>{labels[s] ?? s}</option>;
                })}
              </select>
            </div>

            <div>
              <label className={`${labelCls} mb-2`}>{cd.foreignWorkersLabel} *</label>
              <div className="flex gap-3">
                {([cd.yes, cd.no] as const).map((opt) => {
                  const isYes = opt === cd.yes;
                  const selected = form.foreignWorkers === isYes && form.foreignWorkers !== null;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm({ ...form, foreignWorkers: isYes })}
                      className={`flex-1 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${
                        selected
                          ? "bg-[#0d1f35] text-white border-[#0d1f35]"
                          : "bg-white text-slate-600 border-[#e5e0d2] hover:border-[#d4a84b]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={!allFilled} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
              {cd.continue}
              <span aria-hidden>→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
