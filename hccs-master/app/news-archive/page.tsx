import type { Metadata } from "next";
import NewsArchiveClient from "./NewsArchiveClient";

export const metadata: Metadata = {
  title: "News Archive | HCCS",
};

export default function NewsArchivePage() {
  return <NewsArchiveClient />;
}
