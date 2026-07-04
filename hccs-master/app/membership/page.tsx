import type { Metadata } from "next";
import MembershipClient from "./MembershipClient";

export const metadata: Metadata = {
  title: "Membership Plans : AIHR Platform | HCCS",
  description:
    "Join the HCCS AIHR platform. Free, Essential, Professional, and Strategic plans for Singapore HR compliance, AI chatbot access, and premium templates.",
};

export default function MembershipPage() {
  return <MembershipClient />;
}
