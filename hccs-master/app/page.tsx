import { supabase } from "@/lib/supabase/client";
import HomePageClient from "@/components/HomePageClient";

export default async function HomePage() {
  const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";
  const { data: mediaItems } = await supabase
    .from("media")
    .select("id, title, title_cn, short_description, short_description_cn, image, link, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  const insights = (mediaItems ?? []).filter((m) => m.image && m.link);

  return <HomePageClient mediaItems={insights} storageUrl={storageUrl} />;
}
 