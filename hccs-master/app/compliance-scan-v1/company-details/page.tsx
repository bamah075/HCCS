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
  const cd = t.complianceScanV1.companyDetails;
  const steps = t.complianceScanV1.steps;
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
      router.push(`/compliance-scan-v1/intro?id=${encodeURIComponent(qrId)}`);
      return;
    }

    router.push("/compliance-scan-v1/intro");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i === 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-6 ${i === 0 ? "bg-emerald-300" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{cd.heading}</h1>
          <p className="text-sm text-slate-500 mb-7">{cd.subheading}</p>

          <form onSubmit={handleNext} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{cd.fullName} *</label>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  onInvalid={handleInvalid}
                  placeholder="Jane Smith"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{cd.businessEmail} *</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  onInvalid={handleInvalid}
                  placeholder="jane@company.com"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{cd.companyName} *</label>
                <input
                  name="company"
                  required
                  value={form.company}
                  onChange={handleChange}
                  onInvalid={handleInvalid}
                  placeholder="Acme Pte Ltd"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{cd.mobileNumber}</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+65 9123 4567"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{cd.industryLabel} *</label>
              <select
                name="industry"
                required
                value={form.industry}
                onChange={handleChange}
                onInvalid={handleInvalid}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">{cd.selectIndustry}</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{cd.sizeLabel} *</label>
              <select
                name="size"
                required
                value={form.size}
                onChange={handleChange}
                onInvalid={handleInvalid}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">{cd.selectSize}</option>
                {companySizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{cd.foreignWorkersLabel} *</label>
              <div className="flex gap-3">
                {([cd.yes, cd.no] as const).map((opt) => {
                  const isYes = opt === cd.yes;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm({ ...form, foreignWorkers: isYes })}
                      className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                        form.foreignWorkers === isYes && form.foreignWorkers !== null
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!allFilled}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cd.continue}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
