"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

interface CuratedResource {
  id: number;
  title: string;
  title_cn: string | null;
  description: string | null;
  description_cn: string | null;
  download_url: string | null;
  category: string | null;
}

const governmentUrls: Record<string, string> = {
  "CPF Board": "https://www.cpf.gov.sg",
  "Ministry of Manpower": "https://www.mom.gov.sg",
  "Inland Revenue Authority": "https://www.iras.gov.sg",
  "Accounting & Corporate Regulatory Authority": "https://www.acra.gov.sg",
  "Immigration & Checkpoints Authority": "https://www.ica.gov.sg",
  "Singapore National Employers Federation": "https://www.snef.org.sg",
  "Tripartite Alliance for Fair & Progressive Employment": "https://www.tafep.sg",
  "National Trades Union Congress": "https://www.ntuc.org.sg",
};

const hccsUrls: Record<string, string> = {
  "About HCCS": "/about",
  "HR News & Updates": "/hr-news",
  "Media": "/media",
  "Contact": "/contact",
  "Membership": "/membership",
};

export default function ResourcesClient() {
  const { t, lang } = useLang();
  const r = t.resources;
  const [curated, setCurated] = useState<CuratedResource[]>([]);

  useEffect(() => {
    supabase
      .from("resources")
      .select("id, title, title_cn, description, description_cn, download_url, category")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setCurated((data ?? []) as CuratedResource[]);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <section className="text-center mb-14">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{r.title}</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{r.desc}</p>
      </section>

      {/* Government Links */}
      <section className="mb-14">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{r.govLinksTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {r.governmentLinks.map((link) => (
            <a
              key={link.label}
              href={link.href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#d4a84b]/40 transition-all"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#1a3a52] transition-colors">
                  {link.label}
                </h3>
                <p className="text-sm text-gray-500">{link.description}</p>
              </div>
              <span className="mt-3 text-xs font-semibold text-[#1a3a52]">{r.visitLink}</span>
            </a>
          ))}
        </div>
      </section>

      {/* HCCS Internal Links */}
      <section className="mb-14">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{r.hccsLinksTitle}</h2>
        <div className="flex flex-wrap gap-3">
          {r.hccsLinks.map((link) => (
            <Link
              key={link.label}
              href={hccsUrls[link.label] ?? "/"}
              className="inline-flex items-center gap-1.5 bg-[#F8F5EC] text-[#1a3a52] border border-[#e5e0d2] rounded-full px-4 py-2 text-sm font-medium hover:bg-[#d4a84b]/10 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Curated resources from admin */}
      {curated.length > 0 && (
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">HCCS Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {curated.map((res) => {
              const title = (lang === "zh" && res.title_cn) || res.title;
              const desc = (lang === "zh" && res.description_cn) || res.description;
              const isExternal = !!res.download_url && /^https?:\/\//i.test(res.download_url);
              const inner = (
                <div className="group flex flex-col justify-between bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#d4a84b]/40 transition-all h-full">
                  <div>
                    {res.category && (
                      <span className="inline-block text-xs font-semibold bg-[#d4a84b]/10 text-[#1a3a52] px-2 py-0.5 rounded-full mb-2">
                        {res.category}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#1a3a52] transition-colors">
                      {title}
                    </h3>
                    {desc && <p className="text-sm text-gray-500">{desc}</p>}
                  </div>
                  {res.download_url && (
                    <span className="mt-3 text-xs font-semibold text-[#1a3a52]">
                      {isExternal ? "Visit →" : "Download →"}
                    </span>
                  )}
                </div>
              );
              return res.download_url ? (
                <a
                  key={res.id}
                  href={res.download_url}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                >
                  {inner}
                </a>
              ) : (
                <div key={res.id}>{inner}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-[#0d1f35] text-white rounded-2xl p-10 text-center">
        <h2 className="text-2xl font-bold mb-3">{r.ctaTitle}</h2>
        <p className="text-[#e8c97a] mb-6 max-w-xl mx-auto">{r.ctaDesc}</p>
        <Link
          href="/consultation"
          className="inline-block bg-white text-[#1a3a52] font-bold px-8 py-3 rounded-xl hover:bg-[#F8F5EC] transition-colors"
        >
          {r.ctaButton}
        </Link>
      </section>
    </div>
  );
}
