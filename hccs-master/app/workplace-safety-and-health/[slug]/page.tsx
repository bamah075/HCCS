import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DynamicPageContent from "@/components/DynamicPageContent";

const pages: Record<string, { title: string; description: string }> = {
  "work-injury-compensation": {
    title: "Work Injury Compensation",
    description:
      "The Work Injury Compensation Act (WICA) allows claims for work-related injuries or diseases without starting legal action.",
  },
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return { title: "Page Not Found | HCCS" };
  return { title: `${page.title} | HCCS`, description: page.description };
}

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export default async function WorkplaceSafetyPage({ params }: PageProps) {
  const { slug } = await params;
  const page = pages[slug];

  if (!page) notFound();

  return <DynamicPageContent labelKey="workplaceSafetyLabel" title={page.title} description={page.description} />;
}
