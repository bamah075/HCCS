import type { Metadata } from "next";
import ConsultationSuccessClient from "./ConsultationSuccessClient";

export const metadata: Metadata = {
  title: "Consultation Booked! | HCCS",
};

export default function ConsultationSuccessPage() {
  return <ConsultationSuccessClient />;
}

