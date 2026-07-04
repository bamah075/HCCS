import type { Metadata } from "next";
import HRNewsClient from "./HRNewsClient";

export const metadata: Metadata = {
  title: "HR News : Singapore HR & Employment Updates | HCCS",
  description:
    "Latest Singapore HR, MOM, CPF, TAFEP, and employment regulatory news curated for businesses.",
};

export default function HRNewsPage() {
  return <HRNewsClient />;
}
