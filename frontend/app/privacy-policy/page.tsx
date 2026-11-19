import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/support";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What TopStockBD keeps about you and why: your account, watchlist, portfolio, payments, notifications and how you use the site. Who else handles it, how long we keep it, and how to delete your account.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy",
    description: "What TopStockBD keeps about you, why, for how long, and how to delete your account.",
    url: "/privacy-policy",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/privacy-policy`,
      url: `${BASE_URL}/privacy-policy`,
      name: "Privacy Policy — TopStockBD",
      description: "What TopStockBD keeps about you, why, for how long, and how to delete your account.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Privacy Policy", item: `${BASE_URL}/privacy-policy` },
      ],
    },
  ],
};

/**
 * Rewritten 2026-11-19 (design review): the May 2025 page said no account was
 * needed and no names or emails were kept, written before accounts, the
 * portfolio, payments and push notifications existed. Same layout as the
 * refund policy: each section in both languages, paragraph for paragraph.
 * Keep it true: when a feature starts keeping something new, add it here.
 */
const SECTIONS: { key: string; h: string; hBn: string; body: { en: string; bn: string }[] }[] = [
  {
    key: "short",
    h: "In short",
    hBn: "সংক্ষেপে",
    body: [
      {
        en: "We keep what you give us to run your account, and how you use the site so we can make it better. We never sell or rent it to anyone. We never ask for your bKash or Nagad PIN, your bank password or your BO account details.",
        bn: "আপনার অ্যাকাউন্ট চালাতে আপনি যা দেন, আর সাইটটি আরও ভালো করতে আপনি কীভাবে ব্যবহার করেন, আমরা তা রাখি। এসব আমরা কখনো কারও কাছে বিক্রি বা ভাড়া দিই না। আপনার বিকাশ বা নগদের পিন, ব্যাংকের পাসওয়ার্ড বা বিও অ্যাকাউন্টের তথ্য আমরা কখনো চাই না।",
      },
    ],
  },
  {
    key: "account",
    h: "When you open an account",
    hBn: "অ্যাকাউন্ট খুললে",
    body: [
      {
        en: "Your email address or phone number, and your name if you give one. Your password is stored scrambled, so nobody here can read it. If you sign in with Google, Google sends us your name, email address and profile picture.",
        bn: "আপনার ইমেইল ঠিকানা বা ফোন নম্বর, আর নাম দিলে সেটি। পাসওয়ার্ড এলোমেলো করে রাখা হয়, তাই আমাদের কেউ তা পড়তে পারে না। Google দিয়ে সাইন ইন করলে Google আমাদের আপনার নাম, ইমেইল ঠিকানা আর প্রোফাইল ছবি পাঠায়।",
      },
    ],
  },
  {
    key: "yours",
    h: "What you add",
    hBn: "আপনি যা যোগ করেন",
    body: [
      {
        en: "The shares on your watchlist (with the day and price you added each one), your portfolios (shares, buys, sales, dividends and bonus shares, and the fee and tax rates you set), your price alerts and dividend reminders, your saved screener lists, the companies you hide from For you, and which free analyses you opened. We use them to show you your pages and to send the updates you asked for.",
        bn: "ওয়াচলিস্টের শেয়ার (প্রতিটি যোগ করার দিন আর দামসহ), আপনার পোর্টফোলিও (শেয়ার, কেনা, বিক্রি, ডিভিডেন্ড ও বোনাস শেয়ার, আর আপনার রাখা ফি ও করের হার), প্রাইস অ্যালার্ট আর ডিভিডেন্ডের রিমাইন্ডার, স্ক্রিনারে সেভ করা তালিকা, আপনার জন্য পেজ থেকে লুকানো কোম্পানি, আর কোন ফ্রি বিশ্লেষণগুলো খুলেছেন। এগুলো দিয়ে আমরা আপনার পেজগুলো দেখাই আর আপনার চাওয়া আপডেট পাঠাই।",
      },
    ],
  },
  {
    key: "pay",
    h: "When you pay for Premium",
    hBn: "প্রিমিয়ামের জন্য পেমেন্ট করলে",
    body: [
      {
        en: "The plan, the amount, the date and how you paid. For bKash or Nagad, the number you paid from. For a bank transfer, whether it was NPSB or BEFTN, the last 4 digits of your account and the reference if you wrote one. We use them only to match your payment with our statements, and to send money back if you ask for a refund.",
        bn: "প্ল্যান, টাকার পরিমাণ, তারিখ আর কীভাবে পেমেন্ট করেছেন। বিকাশ বা নগদে হলে যে নম্বর থেকে পাঠিয়েছেন। ব্যাংক ট্রান্সফারে হলে NPSB না BEFTN, আপনার অ্যাকাউন্টের শেষ 4টি সংখ্যা আর রেফারেন্স লিখলে সেটি। এগুলো আমরা শুধু আমাদের স্টেটমেন্টের সঙ্গে আপনার পেমেন্ট মেলাতে আর আপনি টাকা ফেরত চাইলে তা পাঠাতে ব্যবহার করি।",
      },
    ],
  },
  {
    key: "use",
    h: "How you use the site",
    hBn: "আপনি সাইটটি কীভাবে ব্যবহার করেন",
    body: [
      {
        en: "When you are signed in, we note which pages you open, and keep that for 90 days. It tells us which features people use, and lets For you suggest companies like the shares you read about. We also count how often each stock page is opened, without keeping who opened it.",
        bn: "সাইন ইন করা থাকলে আপনি কোন কোন পেজ খোলেন, আমরা তা লিখে রাখি, 90 দিন পর্যন্ত। এতে বুঝি কোন সুবিধাগুলো মানুষ ব্যবহার করেন, আর আপনার জন্য পেজ আপনার পড়া শেয়ারের মতো কোম্পানি দেখাতে পারে। কোন স্টক পেজ কতবার খোলা হলো, তাও আমরা গুনি, তবে কে খুলেছেন তা রাখি না।",
      },
      {
        en: "If you send us feedback, a review or a payment problem, we keep what you wrote. A review appears on our homepage only if we choose to show it, with the name on your account.",
        bn: "আপনি মতামত, রিভিউ বা পেমেন্টের সমস্যা লিখে পাঠালে আমরা তা রেখে দিই। কোনো রিভিউ আমাদের হোমপেজে আসে শুধু আমরা দেখাতে বেছে নিলে, আপনার অ্যাকাউন্টের নামসহ।",
      },
    ],
  },
  {
    key: "notify",
    h: "Notifications and email",
    hBn: "নোটিফিকেশন আর ইমেইল",
    body: [
      {
        en: "If you turn on phone notifications, your browser gives us an address for sending them, through Google, Mozilla, Microsoft or Apple's push service. We keep a list of what we sent you for 180 days so the same news never reaches you twice.",
        bn: "ফোনে নোটিফিকেশন চালু করলে আপনার ব্রাউজার আমাদের সেগুলো পাঠানোর একটি ঠিকানা দেয়, Google, Mozilla, Microsoft বা Apple-এর পুশ সেবার মাধ্যমে। একই খবর যেন দুবার না যায়, সেজন্য আমরা কী পাঠিয়েছি তার তালিকা 180 দিন রাখি।",
      },
      {
        en: "We send email through Resend and Brevo. We note whether an email was opened, and every email has a link to stop them.",
        bn: "আমরা Resend আর Brevo দিয়ে ইমেইল পাঠাই। ইমেইলটি খোলা হলো কি না, আমরা তা দেখি, আর প্রতিটি ইমেইলে সেগুলো বন্ধ করার লিংক থাকে।",
      },
    ],
  },
  {
    key: "browser",
    h: "Your browser and cookies",
    hBn: "আপনার ব্রাউজার আর কুকি",
    body: [
      {
        en: "Your browser keeps your sign-in, your language, your screen theme and some of the data we showed you, so pages open faster. We don't send these anywhere else.",
        bn: "আপনার ব্রাউজারে থাকে আপনার সাইন ইন, ভাষা, স্ক্রিনের ধরন আর আমাদের দেখানো কিছু তথ্য, যাতে পেজ দ্রুত খোলে। এগুলো আমরা অন্য কোথাও পাঠাই না।",
      },
      {
        en: "Google Analytics uses cookies to tell us how pages are used, without your name. Google AdSense uses cookies to show ads, and may use your visits to this and other sites to choose them. You can turn off personalised ads at google.com/settings/ads and at aboutads.info.",
        bn: "Google Analytics কুকি দিয়ে আমাদের জানায় পেজগুলো কীভাবে ব্যবহার হয়, আপনার নাম ছাড়া। Google AdSense বিজ্ঞাপন দেখাতে কুকি ব্যবহার করে, আর বিজ্ঞাপন বাছতে এই ও অন্য সাইটে আপনার যাওয়া-আসা কাজে লাগাতে পারে। ব্যক্তিগত বিজ্ঞাপন বন্ধ করতে পারেন google.com/settings/ads আর aboutads.info-তে।",
      },
    ],
  },
  {
    key: "who",
    h: "Who else handles it",
    hBn: "আর কারা এগুলো সামলায়",
    body: [
      {
        en: "Cloudflare runs the website, Render runs our server and MongoDB Atlas stores the data. Google handles sign-in, analytics and ads, Resend and Brevo send email, and the browser push services deliver notifications. They handle it on our behalf. We don't give your data to anyone else, unless the law requires it.",
        bn: "Cloudflare ওয়েবসাইট চালায়, Render আমাদের সার্ভার চালায়, আর MongoDB Atlas তথ্য রাখে। Google সাইন ইন, অ্যানালিটিক্স আর বিজ্ঞাপন সামলায়, Resend ও Brevo ইমেইল পাঠায়, আর ব্রাউজারের পুশ সেবাগুলো নোটিফিকেশন পৌঁছে দেয়। তারা আমাদের হয়ে এগুলো সামলায়। আইন না চাইলে আপনার তথ্য আমরা আর কাউকে দিই না।",
      },
    ],
  },
  {
    key: "keep",
    h: "How long we keep it",
    hBn: "কতদিন রাখি",
    body: [
      {
        en: "Your account and what you added: for as long as you keep the account. The pages you opened: 90 days. The list of notifications and emails we sent: 180 days. Payment records (date, amount, plan): as long as we need them for our accounts, even after an account is deleted.",
        bn: "আপনার অ্যাকাউন্ট আর আপনার যোগ করা সবকিছু: যতদিন অ্যাকাউন্ট রাখেন। কোন পেজ খুলেছেন: 90 দিন। কী নোটিফিকেশন ও ইমেইল পাঠিয়েছি তার তালিকা: 180 দিন। পেমেন্টের হিসাব (তারিখ, টাকা, প্ল্যান): আমাদের হিসাবের জন্য যতদিন দরকার, অ্যাকাউন্ট মুছে ফেলার পরও।",
      },
    ],
  },
  {
    key: "choices",
    h: "Your choices",
    hBn: "আপনার হাতে যা আছে",
    body: [
      {
        en: "You can see and change your name, watchlist, portfolios and alerts on the site at any time. You can turn phone notifications off in your profile or in your phone's settings, and stop emails with the link in any email.",
        bn: "নাম, ওয়াচলিস্ট, পোর্টফোলিও আর অ্যালার্ট আপনি যেকোনো সময় সাইটেই দেখতে ও বদলাতে পারেন। ফোনের নোটিফিকেশন বন্ধ করতে পারেন প্রোফাইল থেকে বা ফোনের সেটিংস থেকে, আর যেকোনো ইমেইলের লিংক দিয়ে ইমেইল বন্ধ করতে পারেন।",
      },
      {
        en: `To delete your account and everything kept with it, write to ${SUPPORT_EMAIL} from the email or phone number on your account. We delete it within 7 days and tell you when it is done.`,
        bn: `অ্যাকাউন্ট আর এর সঙ্গে রাখা সবকিছু মুছে ফেলতে, অ্যাকাউন্টের ইমেইল বা ফোন নম্বর জানিয়ে ${SUPPORT_EMAIL}-এ লিখুন। আমরা 7 দিনের মধ্যে মুছে ফেলি, আর হয়ে গেলে আপনাকে জানাই।`,
      },
    ],
  },
  {
    key: "age",
    h: "Age",
    hBn: "বয়স",
    body: [
      {
        en: "TopStockBD is for adults who invest, or want to. Please don't open an account if you are under 18.",
        bn: "TopStockBD প্রাপ্তবয়স্কদের জন্য, যারা বিনিয়োগ করেন বা করতে চান। আপনার বয়স 18-এর কম হলে অ্যাকাউন্ট খুলবেন না।",
      },
    ],
  },
  {
    key: "changes",
    h: "Changes to this policy",
    hBn: "এই নীতির পরিবর্তন",
    body: [
      {
        en: "When we start keeping something new, we add it here and change the date at the top. If a change matters to your account, we tell you on the site first.",
        bn: "নতুন কিছু রাখতে শুরু করলে আমরা তা এখানে যোগ করি আর ওপরের তারিখ বদলাই। পরিবর্তনটি আপনার অ্যাকাউন্টের জন্য গুরুত্বপূর্ণ হলে আগে সাইটে আপনাকে জানাই।",
      },
    ],
  },
  {
    key: "contact",
    h: "Questions",
    hBn: "প্রশ্ন",
    body: [
      {
        en: `Write to ${SUPPORT_EMAIL}. We reply within 2 working days.`,
        bn: `${SUPPORT_EMAIL}-এ লিখুন। আমরা 2 কার্যদিবসের মধ্যে উত্তর দিই।`,
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div className="page-narrow space-y-8">
        <PageHeader
          eyebrow={<T en="Privacy" bn="গোপনীয়তা" />}
          title={<T en="Privacy policy" bn="গোপনীয়তা নীতি" />}
          lead={<T en="Last updated: 19 Nov 2026" bn="সর্বশেষ হালনাগাদ: 19 নভেম্বর 2026" />}
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
          <Link href="/disclaimer" className="text-base font-semibold text-primary hover:underline">
            <T en="See the disclaimer →" bn="দায়মুক্তি দেখুন →" />
          </Link>
          <Link href="/refund-policy" className="text-base font-semibold text-primary hover:underline">
            <T en="Refund policy" bn="টাকা ফেরতের নীতি" />
          </Link>
          <Link href="/contact" className="text-base font-semibold text-primary hover:underline">
            <T en="Contact us" bn="যোগাযোগ করুন" />
          </Link>
        </div>
      </div>
    </>
  );
}
