import type { Metadata } from "next";
import EmployerClient from "./EmployerClient";

export const metadata: Metadata = {
  title: "Our Services | HCCS",
  description:
    "HCCS provides end-to-end HR consulting services in Singapore - from EP/PR applications and HR compliance to AI-powered HR solutions.",
};

export default function EmployerPage() {
  return <EmployerClient />;
}
