import type { Metadata } from "next";
import MediaClient from "./MediaClient";

export const metadata: Metadata = {
  title: "Media | HCCS",
  description:
    "Artfully curated insights for founders by experts who care. Follow HCCS media updates and practical guidance for Singapore businesses.",
};

export default function MediaPage() {
  return <MediaClient />;
}
