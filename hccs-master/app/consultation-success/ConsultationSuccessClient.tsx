"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function ConsultationSuccessClient() {
  const { t } = useLang();
  const cs = t.consultationSuccess;

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{cs.title}</h1>
      <p className="text-gray-600 mb-6">{cs.desc}</p>
      <div className="bg-[#F8F5EC] border border-[#e5e0d2] rounded-xl p-5 text-sm text-[#0d1f35] mb-8 text-left space-y-2">
        <p>{cs.emailNote}</p>
        <p>{cs.phoneNote} <a href="tel:+6594362866" className="underline">+65 9436-2866</a></p>
        
      </div>
      <Link
        href="/"
        className="bg-[#1a3a52] text-white px-8 py-3 rounded-lg hover:bg-[#0d1f35] transition-colors font-semibold"
      >
        {cs.returnHome}
      </Link>
    </div>
  );
}
