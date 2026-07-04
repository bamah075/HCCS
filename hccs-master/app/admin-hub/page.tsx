import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Hub | HCCS",
};

export default function AdminHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Admin Hub</h1>
      <p className="text-gray-600 mb-8">Administrative dashboard for member and compliance operations.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5"><h2 className="font-semibold">Manage Members</h2><p className="text-sm text-gray-500 mt-1">View subscriptions and user profiles.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-5"><h2 className="font-semibold">Compliance Scans</h2><p className="text-sm text-gray-500 mt-1">Review submitted scan results.</p></div>
        <div className="bg-white border border-gray-200 rounded-xl p-5"><h2 className="font-semibold">Agent Conversations</h2><p className="text-sm text-gray-500 mt-1">Monitor support and chatbot logs.</p></div>
      </div>
    </div>
  );
}
