import type { Metadata } from "next";
import EmploymentLawsClient from "./EmploymentLawsClient";

export const metadata: Metadata = {
  title: "Singapore Employment Laws | HCCS",
  description:
    "Key Singapore employment legislation explained : Employment Act, EFMA, WICA, Workplace Fairness Act, CPF Act, TAFEP, and Fair Hiring Framework.",
};

export default function EmploymentLawsPage() {
  return <EmploymentLawsClient />;
}
