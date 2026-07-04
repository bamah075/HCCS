import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import HRNewsDetailClient, { type NewsDetailRow } from "./HRNewsDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function fetchArticle(id: number): Promise<NewsDetailRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("news")
    .select("id, title, title_cn, body, body_cn, url, agency_name, content_type, hero_image, published_at, is_published")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return (data as NewsDetailRow | null) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return { title: "Article | HCCS" };
  const article = await fetchArticle(numId);
  if (!article) return { title: "Article not found | HCCS" };
  const title = article.title ?? article.title_cn ?? `HR News #${numId}`;
  const description = (article.body ?? article.body_cn ?? "").slice(0, 160);
  return {
    title: `${title} | HCCS HR News`,
    description: description || undefined,
    openGraph: article.hero_image
      ? { title, description, images: [{ url: article.hero_image }] }
      : { title, description },
  };
}

export default async function HRNewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();
  const article = await fetchArticle(numId);
  return <HRNewsDetailClient article={article} />;
}
