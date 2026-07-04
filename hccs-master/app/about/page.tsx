import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";

export const metadata: Metadata = {
  title: "About HCCS - Our Team & Story",
  description:
    "Strategically building your Singapore workforce with expertise and integrity. Meet Florence Ker and the HCCS senior advisory team with 25+ years of HR expertise.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
