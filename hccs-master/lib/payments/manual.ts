// Centralised PayNow / bank-transfer details for the manual checkout path.
// Temporary while Airwallex + HitPay KYC is pending. Update these constants
// when the bank account or QR rotates — the public manual-checkout page and
// the emails both read from here.

export const PAYNOW_DETAILS = {
    // Static PayNow QR (PayNow-UEN, scan-to-pay). Hosted on HCCS Supabase
    // storage so the image rotates with the rest of the brand assets.
    qrUrl:
        "https://osqmfupzcqlorsayiulk.supabase.co/storage/v1/object/public/images/checkout/paynow-qr-2026-06.jpeg",
    payeeName: "Human Capital Consulting & Services (Spore) Pte Ltd",
    // Customer-facing reference line — what they should put in the bank-app
    // "reference" / "comments" field so reconciliation is easy. The actual
    // reference number is also collected in the form for cross-check.
    referenceHint: "HCCS-<your-email-prefix>",
    enquiryEmail: "enquiry@hccs.sg",
} as const;
