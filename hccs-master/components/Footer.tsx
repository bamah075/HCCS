"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  const f = t.footer;

  return (
    <footer className="bg-slate-950 text-slate-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">HCCS</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line">{f.tagline}</p>
          <p className="mt-4 text-sm">
            10 Anson Road #05-01<br />
            International Plaza<br />
            Singapore 079903
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">{f.services}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/services/employment-pass" className="hover:text-[#d4a84b] transition-colors">{f.epPr}</Link></li>
            <li><Link href="/services/hr-compliance-audit" className="hover:text-[#d4a84b] transition-colors">{f.hrCompliance}</Link></li>
            <li><Link href="/services/workforce-planning" className="hover:text-[#d4a84b] transition-colors">{f.workforcePlanning}</Link></li>
            <li><Link href="/services/fractional-hr" className="hover:text-[#d4a84b] transition-colors">{f.fractionalHr}</Link></li>
            <li><Link href="/services/aihr-retainer" className="hover:text-[#d4a84b] transition-colors">{f.aiHr}</Link></li>
            <li><Link href="/compliance-scan-v1" className="hover:text-[#d4a84b] transition-colors">{f.freeScan}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">{f.company}</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-[#d4a84b] transition-colors">{f.aboutUs}</Link></li>
            <li><Link href="/membership" className="hover:text-[#d4a84b] transition-colors">{t.nav.membership}</Link></li>
            <li><Link href="/hr-news" className="hover:text-[#d4a84b] transition-colors">{f.hrNews}</Link></li>
            <li><Link href="/employment-laws" className="hover:text-[#d4a84b] transition-colors">{f.employmentLaws}</Link></li>
            <li><Link href="/resources" className="hover:text-[#d4a84b] transition-colors">{t.nav.resources}</Link></li>
            <li><Link href="/contact" className="hover:text-[#d4a84b] transition-colors">{f.contact}</Link></li>
            <li><Link href="/privacy" className="hover:text-[#d4a84b] transition-colors">{f.privacy}</Link></li>
            <li><Link href="/terms" className="hover:text-[#d4a84b] transition-colors">{f.terms}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">{t.resources.govLinksTitle}</h3>
          <ul className="space-y-2 text-sm">
            {t.resources.governmentLinks.map((item: { label: string; href: string }, idx: number) => (
              <li key={idx}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#d4a84b] transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">{f.contact}</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="mailto:enquiry@hccs.sg" className="hover:text-[#d4a84b] transition-colors">
                enquiry@hccs.sg
              </a>
            </li>
            <li>
              <a href="tel:+6594362866" className="hover:text-[#d4a84b] transition-colors">
                +65 9436-2866
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/6565943628"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#d4a84b] transition-colors"
              >
                {f.whatsapp}
              </a>
            </li>
          </ul>
          <div className="mt-4 flex gap-3 text-sm">
            <a
              href="https://www.tiktok.com/@askbeebeesghr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d4a84b] transition-colors"
            >
              TikTok
            </a>
            <a
              href="https://www.linkedin.com/in/bee-bee-ker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d4a84b] transition-colors"
            >
              LinkedIn
            </a>
            <a
              href="https://www.facebook.com/hccs.sg"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d4a84b] transition-colors"
            >
              Facebook
            </a>
          </div>
          <Link
            href="/consultation"
            className="mt-5 inline-block bg-[#d4a84b] hover:bg-[#b8902f] hover:text-white text-[#0d1f35] text-sm px-4 py-2 rounded-md font-semibold transition-colors"
          >
            {f.bookConsultation}
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-800 text-center text-xs py-5 text-slate-500">
        {`© ${new Date().getFullYear()} Human Capital Consulting & Services (Spore) Pte Ltd. All rights reserved. | `}{f.bilingualNote}
      </div>
    </footer>
  );
}

//         Human Capital Consulting &amp; Services (Spore) Pte Ltd<br />
//         MOM-registered, Licensed EA Agency<br />
//         25+ years experience
//       </p>
//       <p className="mt-4 text-sm">
//         10 Anson Road #33-15<br />
//         International Plaza<br />
//         Singapore 079903
//       </p>
//     </div>

//     <div>
//       <h3 className="text-white font-semibold mb-3">Services</h3>
//       <ul className="space-y-2 text-sm">
//         <li><Link href="/employer" className="hover:text-[#d4a84b] transition-colors">EP / PR Applications</Link></li>
//         <li><Link href="/employer" className="hover:text-[#d4a84b] transition-colors">HR Compliance</Link></li>
//         <li><Link href="/employer" className="hover:text-[#d4a84b] transition-colors">Workforce Planning</Link></li>
//         <li><Link href="/employer" className="hover:text-[#d4a84b] transition-colors">Fractional HR</Link></li>
//         <li><Link href="/employer" className="hover:text-[#d4a84b] transition-colors">AI HR Solutions</Link></li>
//         <li><Link href="/compliance-scan" className="hover:text-[#d4a84b] transition-colors">Free Compliance Scan</Link></li>
//       </ul>
//     </div>

//     <div>
//       <h3 className="text-white font-semibold mb-3">Company</h3>
//       <ul className="space-y-2 text-sm">
//         <li><Link href="/about" className="hover:text-[#d4a84b] transition-colors">About Us</Link></li>
//         <li><Link href="/membership" className="hover:text-[#d4a84b] transition-colors">Membership</Link></li>
//         <li><Link href="/hr-news" className="hover:text-[#d4a84b] transition-colors">HR News</Link></li>
//         <li><Link href="/employment-laws" className="hover:text-[#d4a84b] transition-colors">Employment Laws</Link></li>
//         <li><Link href="/resources" className="hover:text-[#d4a84b] transition-colors">Resources</Link></li>
//         <li><Link href="/contact" className="hover:text-[#d4a84b] transition-colors">Contact</Link></li>
//         <li><Link href="/privacy" className="hover:text-[#d4a84b] transition-colors">Privacy Policy</Link></li>
//         <li><Link href="/terms" className="hover:text-[#d4a84b] transition-colors">Terms of Service</Link></li>
//       </ul>
//     </div>

//     <div>
//       <h3 className="text-white font-semibold mb-3">Contact</h3>
//       <ul className="space-y-2 text-sm">
//         <li>
//           <a href="mailto:enquiry@hccs.sg" className="hover:text-[#d4a84b] transition-colors">
//             enquiry@hccs.sg
//           </a>
//         </li>
//         <li>
//           <a href="tel:+6594362866" className="hover:text-[#d4a84b] transition-colors">
//             +65 9436-2866
//           </a>
//         </li>
//         <li>
//           <a
//             href="https://wa.me/6565943628"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="hover:text-[#d4a84b] transition-colors"
//           >
//             WhatsApp Us
//           </a>
//         </li>
//       </ul>
//       <div className="mt-4 flex gap-3 text-sm">
//         <a
//           href="https://www.tiktok.com/@askbeebeesghr"
//           target="_blank"
//           rel="noopener noreferrer"
//           className="hover:text-[#d4a84b] transition-colors"
//         >
//           TikTok
//         </a>
//         <a href="#" className="hover:text-[#d4a84b] transition-colors">LinkedIn</a>
//         <a href="#" className="hover:text-[#d4a84b] transition-colors">Facebook</a>
//       </div>
//       <Link
//         href="/consultation"
//         className="mt-5 inline-block bg-[#1a3a52] text-white text-sm px-4 py-2 rounded hover:bg-[#0d1f35] transition-colors"
//       >
//         Book Free Consultation
//       </Link>
//     </div>
//   </div>

//   <div className="border-t border-gray-800 text-center text-xs py-4 text-gray-500">
//     © {new Date().getFullYear()} Human Capital Consulting &amp; Services (Spore) Pte Ltd. All rights reserved.
//     &nbsp;|&nbsp; Bilingual Support: EN / 中文
//   </div>
// </footer>
// );
// }
