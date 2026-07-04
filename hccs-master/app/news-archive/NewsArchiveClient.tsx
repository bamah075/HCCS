"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface ArchivedItem {
  id: number;
  title: string;
  url: string | null;
  published_at: string | null;
  agency_name: string | null;
}

function formatMonth(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-SG", { month: "short", year: "numeric" });
}

export default function NewsArchiveClient() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // News older than 30 days — anything published recently belongs on /hr-news.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("news")
      .select("id, title, url, published_at, agency_name")
      .eq("is_published", true)
      .lt("published_at", cutoff)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(50)
      .then(({ data }) => {
        setItems((data ?? []) as ArchivedItem[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">News Archive</h1>
      <p className="text-gray-600 mb-8">Historical HR and employment updates curated by HCCS.</p>

      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="text-gray-500">No archived items yet.</p>
      )}

      <div className="space-y-3">
        {items.map((n) => {
          const content = (
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#e5e0d2] transition-colors">
              <p className="text-xs text-gray-400 mb-1">
                {formatMonth(n.published_at)}
                {n.agency_name ? ` · ${n.agency_name}` : ""}
              </p>
              <p className="font-medium text-gray-900">{n.title}</p>
            </div>
          );
          return n.url ? (
            <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block">
              {content}
            </a>
          ) : (
            <div key={n.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
