import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner Access Panel | HCCS",
};

export default function OwnerAccessPanelPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Owner Access Panel</h1>
      <p className="text-gray-600 mb-8">Super-admin controls for access grants, security settings, and account governance.</p>
      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">Grant or revoke admin permissions by email.</div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">Audit recent privileged actions.</div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">Manage protected feature flags.</div>
      </div>
    </div>
  );
}
