import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { PAID_PLANS } from "@/lib/premium-plans";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Refund Policy — Premium Payments",
  description:
    "How TopStockBD Premium payments by bKash, Nagad and bank transfer work: what you pay, how we check it, nothing renews by itself, and a full refund within 7 days.",
  keywords: ["TopStockBD refund policy", "TopStockBD Premium payment", "bKash payment", "Nagad payment", "bank transfer payment", "DSE stock analysis subscription"],
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund Policy — TopStockBD Premium",
    description: "Pay by bKash, Nagad or bank transfer, nothing renews by itself, full refund within 7 days.",
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

/** Each section in both languages, paragraph for paragraph. */
const SECTIONS: { key: string; h: string; hBn: string; body: { en: string; bn: string }[] }[] = [
  {
    key: "pay",
    h: "What you pay",
    hBn: "কত টাকা দেবেন",
    body: [
      {
        en: PAID_PLANS.map((p) => `${p.name}: ৳${p.amount.toLocaleString("en-IN")} (${p.days} days)`).join(" · ") + ".",
        bn: PAID_PLANS.map((p) => `${p.bn}: ৳${p.amount.toLocaleString("en-IN")} (${p.days} দিন)`).join(" · ") + "।",
      },
      {
        en: "You pay once, by bKash or Nagad Send Money to the number shown on the Premium page, or by bank transfer (NPSB or BEFTN) to the bank account shown there. Prices are in taka and include everything, so there are no extra charges from us. bKash, Nagad or your bank may charge their own fee.",
        bn: "আপনি একবারই পেমেন্ট করেন, বিকাশ বা নগদের সেন্ড মানি দিয়ে প্রিমিয়াম পেজে দেখানো নম্বরে, অথবা ব্যাংক ট্রান্সফারে (NPSB বা BEFTN) সেখানে দেখানো ব্যাংক অ্যাকাউন্টে। দাম টাকায়, আর এতেই সব ধরা আছে, তাই আমাদের দিক থেকে কোনো বাড়তি খরচ নেই। বিকাশ, নগদ বা আপনার ব্যাংক তাদের নিজস্ব চার্জ নিতে পারে।",
      },
    ],
  },
  {
    key: "start",
    h: "When Premium starts",
    hBn: "প্রিমিয়াম কখন চালু হয়",
    body: [
      {
        en: "Premium starts as soon as you tell us how you paid and tap the button. For bKash or Nagad, that is the number you paid from. For a bank transfer, it is NPSB or BEFTN, the last 4 digits of your account, and the reference if you wrote one. If you still have Premium days left, the new days are added after them.",
        bn: "কীভাবে পেমেন্ট করেছেন জানিয়ে বোতামে চাপ দিলেই প্রিমিয়াম চালু হয়। বিকাশ বা নগদে হলে যে নম্বর থেকে পেমেন্ট করেছেন। ব্যাংক ট্রান্সফারে হলে NPSB না BEFTN, আপনার অ্যাকাউন্টের শেষ 4টি সংখ্যা, আর রেফারেন্স লিখে থাকলে সেটি। আপনার প্রিমিয়ামের দিন বাকি থাকলে নতুন দিনগুলো সেগুলোর পরে যোগ হয়।",
      },
      {
        en: "We check every payment against our bKash, Nagad and bank statements. If no matching payment came in, Premium is switched off and those days are taken back. A BEFTN transfer can take until the next working day to reach us, so we wait for it before we decide.",
        bn: "প্রতিটি পেমেন্ট আমরা আমাদের বিকাশ, নগদ ও ব্যাংকের স্টেটমেন্টের সঙ্গে মিলিয়ে দেখি। মিল থাকা কোনো পেমেন্ট না এলে প্রিমিয়াম বন্ধ করা হয়, আর সেই দিনগুলো ফিরিয়ে নেওয়া হয়। BEFTN-এ টাকা পৌঁছাতে পরের কার্যদিবস পর্যন্ত লাগতে পারে, তাই সিদ্ধান্ত নেওয়ার আগে আমরা অপেক্ষা করি।",
      },
    ],
  },
  {
    key: "renew",
    h: "Nothing renews by itself",
    hBn: "নিজে থেকে নবায়ন হয় না",
    body: [
      {
        en: "We never take money from your account. When your plan ends, your account goes back to free. A few days before that, we remind you, and you pay again only if you want to.",
        bn: "আমরা কখনো আপনার অ্যাকাউন্ট থেকে টাকা কাটি না। প্ল্যানের মেয়াদ শেষ হলে আপনার অ্যাকাউন্ট আবার ফ্রি হয়ে যায়। তার কয়েক দিন আগে আমরা আপনাকে মনে করিয়ে দিই, আর আপনি চাইলে তবেই আবার পেমেন্ট করেন।",
      },
    ],
  },
  {
    key: "refunds",
    h: "Refunds",
    hBn: "টাকা ফেরত",
    body: [
      {
        en: "Ask within 7 days of paying and we send the full amount back to the bKash or Nagad number you paid from, usually within 3 working days. If you paid by bank transfer, we send it back to your bank account, and we will ask you for its details. Premium is switched off when the refund is sent.",
        bn: "পেমেন্টের 7 দিনের মধ্যে জানালে আমরা পুরো টাকা যে বিকাশ বা নগদ নম্বর থেকে পেমেন্ট করেছেন সেখানে ফেরত পাঠাই, সাধারণত 3 কার্যদিবসের মধ্যে। ব্যাংক ট্রান্সফারে পেমেন্ট করলে টাকা আপনার ব্যাংক অ্যাকাউন্টে ফেরত পাঠাই, আর সেজন্য অ্যাকাউন্টের তথ্য আপনার কাছে চেয়ে নেব। টাকা ফেরত পাঠানোর সময় প্রিমিয়াম বন্ধ করা হয়।",
      },
      {
        en: "After 7 days, we do not refund the part of a plan you have not used, but Premium stays on until the plan ends.",
        bn: "7 দিন পার হলে প্ল্যানের যে অংশ ব্যবহার করেননি, তার টাকা ফেরত দেওয়া হয় না, তবে প্ল্যানের মেয়াদ শেষ না হওয়া পর্যন্ত প্রিমিয়াম চালু থাকে।",
      },
      {
        en: "Paid twice by mistake, or sent the wrong amount? Tell us and we will send the extra back, whenever it happened.",
        bn: "ভুল করে দুবার পেমেন্ট করেছেন, বা ভুল পরিমাণ টাকা পাঠিয়েছেন? আমাদের জানান। যখনই ঘটে থাকুক, বাড়তি টাকা আমরা ফেরত পাঠাব।",
      },
    ],
  },
  {
    key: "ask",
    h: "How to ask",
    hBn: "কীভাবে জানাবেন",
    body: [
      {
        en: "Use the contact page, and give the email or phone number on your account, the number you paid from and the date. We reply within 2 working days.",
        bn: "যোগাযোগ পেজে আপনার অ্যাকাউন্টের ইমেইল বা ফোন নম্বর, যে নম্বর থেকে পেমেন্ট করেছেন সেটি আর তারিখ লিখে জানান। আমরা 2 কার্যদিবসের মধ্যে উত্তর দিই।",
      },
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div className="page-narrow space-y-8">
        <PageHeader
          eyebrow={<T en="Premium" bn="প্রিমিয়াম" />}
          title={<T en="Refund policy" bn="টাকা ফেরতের নীতি" />}
          lead={<T en="Last updated: 25 Oct 2026" bn="সর্বশেষ হালনাগাদ: 25 অক্টোবর 2026" />}
        />

        {SECTIONS.map((s) => (
          <section key={s.key} className="space-y-2">
            <h2 className="text-xl font-bold text-text-main">
              <T en={s.h} bn={s.hBn} />
            </h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-text-main">
                <T en={p.en} bn={p.bn} />
              </p>
            ))}
          </section>
        ))}

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link href="/premium" className="text-base font-semibold text-primary hover:underline">
            <T en="See Premium plans →" bn="প্রিমিয়াম প্ল্যান দেখুন →" />
          </Link>
          <Link href="/contact" className="text-base font-semibold text-primary hover:underline">
            <T en="Contact us" bn="যোগাযোগ করুন" />
          </Link>
        </div>
      </div>
    </>
  );
}
