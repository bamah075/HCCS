import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DynamicPageContent from "@/components/DynamicPageContent";

const pages: Record<string, { title: string; description: string }> = {
  "employment-act": {
    title: "About the Employment Act",
    description:
      "The Employment Act is Singapore's main labour law and provides core terms and working conditions for most employees.",
  },
  retirement: {
    title: "Retirement",
    description:
      "Reference guidance on retirement-related employment practices and employer obligations in Singapore.",
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

export default async function EmploymentPracticesPage({ params }: PageProps) {
  const { slug } = await params;
  const page = pages[slug];

  if (!page) notFound();

  return <DynamicPageContent labelKey="employmentPracticesLabel" title={page.title} description={page.description} />;
}
