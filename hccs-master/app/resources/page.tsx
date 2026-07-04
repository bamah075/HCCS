import type { Metadata } from "next";
import ResourcesClient from "./ResourcesClient";

export const metadata: Metadata = {
  title: "Resources | HCCS",
  description:
    "External HR and compliance resources for Singapore employers, including CPF, MOM, IRAS, ACRA, ICA, SNEF, TAFEP, and NTUC links.",
};

export default function ResourcesPage() {
  return <ResourcesClient />;
}
