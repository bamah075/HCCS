import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | HCCS",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
