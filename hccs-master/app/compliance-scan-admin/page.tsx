import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance Scan Admin | HCCS",
};

export default function ComplianceScanAdminPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Compliance Scan Admin</h1>
      <p className="text-gray-600 mb-8">Administrative review of all compliance scan submissions.</p>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-700">Queue summary, risk segmentation, and downloadable scan reports appear here.</p>
      </div>
    </div>
  );
}
