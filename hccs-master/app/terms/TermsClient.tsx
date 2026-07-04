"use client";

import { useLang } from "@/lib/i18n";

export default function TermsClient() {
  const { t } = useLang();
  const tc = t.terms;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{tc.title}</h1>
      <p className="text-sm text-gray-400 mb-8">{tc.lastUpdated}</p>

      <div className="text-sm leading-relaxed space-y-6">
        {tc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-gray-900">{section.heading}</h2>
            <p className="text-gray-600">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
