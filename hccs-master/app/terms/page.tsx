import type { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service | HCCS",
};

export default function TermsPage() {
  return <TermsClient />;
}
