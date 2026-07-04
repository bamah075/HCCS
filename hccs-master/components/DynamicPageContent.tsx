"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

type DynamicPageKey = "tafepLabel" | "passesLabel" | "workplaceSafetyLabel" | "employmentPracticesLabel";

export default function DynamicPageContent({
  labelKey,
  title,
  description,
}: {
  labelKey: DynamicPageKey;
  title: string;
  description: string;
}) {
  const { t } = useLang();
  const dp = t.dynamicPages;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <header className="border-b border-[#e5e0d2] pb-8 mb-10">
        <p className="eyebrow">{dp[labelKey]}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] leading-tight mb-5">
          {title}
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">{description}</p>
      </header>

      <div className="prose">
        <p>
          This page is part of HCCS&rsquo; reference library of Singapore HR and compliance topics.
          Detailed guidance and resources will be added here. For consultative support on this topic,
          {" "}
          <Link href="/consultation">book a free consultation</Link>{" "}
          with the HCCS team.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3 pt-8 border-t border-[#e5e0d2]">
        <Link href="/resources" className="btn-ghost">
          ← {dp.exploreMoreResources}
        </Link>
        <Link href="/consultation" className="btn-primary">
          Book a consultation
        </Link>
      </div>
    </article>
  );
}
