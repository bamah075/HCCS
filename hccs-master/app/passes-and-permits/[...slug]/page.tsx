import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DynamicPageContent from "@/components/DynamicPageContent";

const pages: Record<string, { title: string; description: string }> = {
  "work-permit-for-foreign-worker": {
    title: "Work Permit for Foreign Worker",
    description:
      "Reference guidance on work permit requirements and related employer obligations for foreign workers in Singapore.",
  },
  "work-permit-for-foreign-worker/foreign-worker-levy/what-is-the-foreign-worker-levy": {
    title: "What is the Foreign Worker Levy",
    description:
      "Reference information on the foreign worker levy framework and how it applies to employers in Singapore.",
  },
};

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const key = slug.join("/");
  const page = pages[key];
  if (!page) return { title: "Page Not Found | HCCS" };
  return { title: `${page.title} | HCCS`, description: page.description };
}

export function generateStaticParams() {
  return Object.keys(pages).map((key) => ({ slug: key.split("/") }));
}

export default async function PassesAndPermitsPage({ params }: PageProps) {
  const { slug } = await params;
  const key = slug.join("/");
  const page = pages[key];

  if (!page) notFound();

  return <DynamicPageContent labelKey="passesLabel" title={page.title} description={page.description} />;
}
