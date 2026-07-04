"use client";

import { useLang } from "@/lib/i18n";

export default function PrivacyClient() {
  const { t } = useLang();
  const p = t.privacy;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{p.title}</h1>
      <p className="text-sm text-gray-400 mb-8">{p.lastUpdated}</p>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        {p.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-gray-900">{section.heading}</h2>
            <p className="text-gray-600">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
