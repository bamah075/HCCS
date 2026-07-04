import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compliance Scan Pool | HCCS",
};

export default function ComplianceScanPoolPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Compliance Scan Pool</h1>
      <p className="text-gray-600 mb-8">Central queue for incoming HR compliance scans requiring review.</p>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-700">Filter by risk level, industry, and submission date.</p>
      </div>
    </div>
  );
}
