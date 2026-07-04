import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-[#F8F5EC] flex items-center justify-center px-4">
      <div className="max-w-xl text-center py-20">
        <p className="font-display text-8xl sm:text-9xl text-[#d4a84b] leading-none mb-6">404</p>
        <span className="rule-gold mx-auto" />
        <h1 className="font-display text-3xl sm:text-4xl text-[#0d1f35] mt-6 mb-4">
          Page not found
        </h1>
        <p className="text-slate-600 leading-relaxed mb-9 max-w-md mx-auto">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
          Use the links below to find your way.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/consultation" className="btn-ghost">
            Book a consultation
          </Link>
        </div>
        <div className="mt-10 pt-8 border-t border-[#e5e0d2]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-4">
            Or try one of these
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {[
              { label: "Services", href: "/services" },
              { label: "Employment Laws", href: "/employment-laws" },
              { label: "Compliance Scan", href: "/compliance-scan" },
              { label: "HR News", href: "/hr-news" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[#1a3a52] hover:text-[#0d1f35] underline-offset-4 hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
