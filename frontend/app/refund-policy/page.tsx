import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Bn from "@/components/i18n/Bn";
import { PAID_PLANS } from "@/lib/premium-plans";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Refund Policy — Premium Payments",
  description:
    "How TopStockBD Premium payments by bKash and Nagad work: what you pay, how we check it, nothing renews by itself, and a full refund within 7 days.",
  keywords: ["TopStockBD refund policy", "TopStockBD Premium payment", "bKash payment", "Nagad payment", "DSE stock analysis subscription"],
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund Policy — TopStockBD Premium",
    description: "Pay by bKash or Nagad, nothing renews by itself, full refund within 7 days.",
    url: `${BASE_URL}/refund-policy`,
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/refund-policy`,
      url: `${BASE_URL}/refund-policy`,
      name: "Refund Policy — TopStockBD",
      description: "Refund and payment policy for TopStockBD Premium.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Refund Policy", item: `${BASE_URL}/refund-policy` },
      ],
    },
  ],
};

const SECTIONS: { h: string; bnH: string; body: string[]; bn: string }[] = [
  {
    h: "What you pay",
    bnH: "কত টাকা দেবেন",
    body: [
      PAID_PLANS.map((p) => `${p.name}: ৳${p.amount.toLocaleString("en-IN")} (${p.days} days)`).join(" · ") + ".",
      "You pay once, by bKash or Nagad Send Money, to the number shown on the Premium page. Prices are in taka and include everything — there are no extra charges from us. bKash or Nagad may charge their own Send Money fee.",
    ],
    bn: "একবার পেমেন্ট, bKash বা Nagad-এর Send Money দিয়ে, প্রিমিয়াম পাতায় দেখানো নম্বরে। আমাদের দিক থেকে কোনো বাড়তি খরচ নেই।",
  },
  {
    h: "When Premium starts",
    bnH: "প্রিমিয়াম কখন চালু হয়",
    body: [
      "Premium starts as soon as you type the number you paid from and tap the button. If you still have Premium days left, the new days are added after them.",
      "We check every payment against our bKash and Nagad statements. If no matching payment came from the number you typed, Premium is switched off and those days are taken back.",
    ],
    bn: "বোতাম চাপলেই প্রিমিয়াম চালু হয়। প্রতিটি পেমেন্ট আমরা মিলিয়ে দেখি; মিল না পেলে প্রিমিয়াম বন্ধ হয়।",
  },
  {
    h: "Nothing renews by itself",
    bnH: "নিজে থেকে নবায়ন হয় না",
    body: [
      "We never take money from your account. When your plan ends, your account goes back to free. A few days before that we remind you, and you pay again only if you want to.",
    ],
    bn: "আমরা কখনো আপনার অ্যাকাউন্ট থেকে টাকা কাটি না। মেয়াদ শেষে অ্যাকাউন্ট ফ্রি হয়ে যায়।",
  },
  {
    h: "Refunds",
    bnH: "টাকা ফেরত",
    body: [
      "Ask within 7 days of paying and we send the full amount back to the bKash or Nagad number you paid from, usually within 3 working days. Premium is switched off when the refund is sent.",
      "After 7 days we don't refund the part of a plan you haven't used, but Premium stays on until the plan ends.",
      "Paid twice by mistake, or sent the wrong amount? Tell us and we'll send the extra back, whenever it happened.",
    ],
    bn: "পেমেন্টের 7 দিনের মধ্যে জানালে পুরো টাকা যে নম্বর থেকে দিয়েছেন সেখানে ফেরত দেব। ভুল করে দুবার বা বেশি টাকা পাঠালে যেকোনো সময় বাড়তি টাকা ফেরত পাবেন।",
  },
  {
    h: "How to ask",
    bnH: "কীভাবে জানাবেন",
    body: [
      "Use the contact page with the email or phone on your account, the number you paid from and the date. We reply within 2 working days.",
    ],
    bn: "যোগাযোগ পাতায় আপনার অ্যাকাউন্টের ইমেইল বা ফোন, যে নম্বর থেকে পেমেন্ট করেছেন আর তারিখ লিখে জানান।",
  },
];

export default function RefundPolicyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div className="page-narrow space-y-8">
        <PageHeader
          eyebrow="Premium"
          title="Refund policy"
          bn="প্রিমিয়ামের পেমেন্ট আর টাকা ফেরতের নিয়ম।"
          lead="Last updated: 25 Oct 2026"
        />

        {SECTIONS.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-xl font-bold text-text-main">{s.h}</h2>
            <Bn className="text-sm text-text-muted">{s.bnH}</Bn>
            {s.body.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-text-main">{p}</p>
            ))}
            <Bn className="text-base leading-relaxed text-text-muted">{s.bn}</Bn>
          </section>
        ))}

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link href="/premium" className="text-base font-semibold text-primary hover:underline">See Premium plans →</Link>
          <Link href="/contact" className="text-base font-semibold text-primary hover:underline">Contact us</Link>
        </div>
      </div>
    </>
  );
}
