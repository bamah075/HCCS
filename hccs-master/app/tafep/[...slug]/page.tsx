import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DynamicPageContent from "@/components/DynamicPageContent";

const pages: Record<string, { title: string; description: string }> = {
  "getting-started": {
    title: "TAFEP Getting Started",
    description:
      "Reference guidance for employers getting started with fair and progressive employment practices.",
  },
  "getting-started/fair/tripartite-guidelines": {
    title: "Tripartite Guidelines",
    description:
      "Reference material on tripartite guidelines supporting fair, responsible, and inclusive workplace practices.",
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

export default async function TafepPage({ params }: PageProps) {
  const { slug } = await params;
  const key = slug.join("/");
  const page = pages[key];

  if (!page) notFound();

  return <DynamicPageContent labelKey="tafepLabel" title={page.title} description={page.description} />;
}
