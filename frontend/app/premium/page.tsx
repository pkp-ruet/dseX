import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Premium — Full Stock Analysis, Free for a Month",
  description:
    "TopStockBD Premium: the full analysis on every DSE stock page, a deeper portfolio check with an action list, a watcher on every stock you own, your full portfolio history, a what-if tool, a yearly statement, more than one portfolio, unlimited watchlist, price alerts and TopStock AI. Try it free for one month — no payment.",
  keywords: [
    "TopStockBD Premium",
    "DSE stock analysis",
    "Bangladesh stock market analysis",
    "DSE portfolio analysis",
    "DSE price alert",
    "শেয়ার বাজার বিশ্লেষণ",
  ],
  alternates: { canonical: "/premium" },
  openGraph: {
    title: "TopStockBD Premium — free for one month",
    description: "The full analysis behind every DSE stock and your portfolio. One free month, no payment.",
    url: `${BASE_URL}/premium`,
    type: "website",
  },
};

// Only features that are live. Add a row as each premium feature ships.
const ROWS: { what: string; bn: string; free: string; premium: string }[] = [
  {
    what: "Stock page analysis",
    bn: "শেয়ারের পাতার বিশ্লেষণ",
    free: "Prices, charts, financials, dividends, owners, news + the score, grade and Buy/Sell word",
    premium: "Also the reasons: fair-value estimate, all five health checks, every good sign and watch-out, price verdict, sector standing",
  },
  {
    what: "In-depth reports",
    bn: "গভীর বিশ্লেষণ রিপোর্ট",
    free: "Headline, bottom line and the first section",
    premium: "The whole report",
  },
  {
    what: "Portfolio check",
    bn: "পোর্টফোলিও পরীক্ষা",
    free: "Grade, headline and the first point of each list",
    premium: "Everything, plus a risk check, the price you paid, cash income, you vs the market and an action list for every stock",
  },
  {
    what: "Portfolio watcher",
    bn: "পোর্টফোলিও পাহারা",
    free: "How many things we spotted on your stocks this month",
    premium: "What they were, plus a phone alert for each: record date coming, new results, category change, a big fall, a yearly low",
  },
  {
    what: "Portfolio history",
    bn: "পোর্টফোলিওর ইতিহাস",
    free: "Your value over the last month, money made from sales and cash dividends",
    premium: "Your whole history next to DSEX, and every figure after fees and dividend tax",
  },
  {
    what: "What-if check",
    bn: "যদি এমন করি",
    free: "—",
    premium: "Try a sale or a buy and see your portfolio grade before you act",
  },
  {
    what: "Yearly statement",
    bn: "বার্ষিক হিসাব",
    free: "—",
    premium: "Every buy, sale, cash dividend and bonus share for the year — print it or download it",
  },
  {
    what: "Portfolios",
    bn: "পোর্টফোলিও সংখ্যা",
    free: "One",
    premium: "Up to six — keep a parent's or spouse's BO account apart from yours",
  },
  {
    what: "Research lists",
    bn: "গবেষণা তালিকা",
    free: "What each of the six lists looks for, and how many companies pass its checks",
    premium: "Every stock on all six lists: a research card with its fair-value range and main risk, all of them side by side, and who joined or left this month",
  },
  {
    what: "Dividend calendar",
    bn: "ডিভিডেন্ড ক্যালেন্ডার",
    free: "The first quarter of each list: record dates, AGMs, biggest cash dividends, just declared",
    premium: "Every list in full",
  },
  { what: "Watchlist", bn: "ওয়াচলিস্ট", free: "10 stocks", premium: "No limit" },
  { what: "Price alerts", bn: "প্রাইস অ্যালার্ট", free: "3 at a time", premium: "No limit" },
  { what: "TopStock AI", bn: "টপস্টক এআই", free: "10 questions a day", premium: "No limit" },
];

// Planned prices — shown so readers know what Premium will cost after the free
// month. Nothing is charged yet (no billing in v1); change them here.
const PLANS: { name: string; bn: string; price: string; per: string; perBn: string; note: string; noteBn: string; best?: boolean }[] = [
  {
    name: "Monthly",
    bn: "মাসিক",
    price: "৳199",
    per: "a month",
    perBn: "প্রতি মাসে",
    note: "Stop any month.",
    noteBn: "যেকোনো মাসে বন্ধ করা যাবে।",
  },
  {
    name: "Yearly",
    bn: "বার্ষিক",
    price: "৳1,449",
    per: "a year",
    perBn: "প্রতি বছরে",
    note: "About ৳121 a month — you save ৳939 a year.",
    noteBn: "মাসে প্রায় ৳121 — বছরে ৳939 সাশ্রয়।",
    best: true,
  },
];

const FAQS: { q: string; a: string; bn: string }[] = [
  {
    q: "What does the free month cost?",
    a: "Nothing. Tap “Start my free month” on this page while signed in and Premium is on for 30 days. There is no card and no payment.",
    bn: "কিছুই না। সাইন ইন করে এই পাতায় “Start my free month” চাপলেই 30 দিন প্রিমিয়াম চালু। কোনো কার্ড বা পেমেন্ট লাগবে না।",
  },
  {
    q: "How much will Premium cost?",
    a: "The plan is ৳199 a month or ৳1,449 a year. Paid plans aren't open yet, so nobody is charged today — the free month is the only way in for now.",
    bn: "পরিকল্পিত দাম মাসে ৳199 বা বছরে ৳1,449। পেইড প্ল্যান এখনো চালু হয়নি, তাই এখন কারও টাকা কাটা হচ্ছে না — আপাতত শুধু ফ্রি মাস।",
  },
  {
    q: "What happens when the month ends?",
    a: "Your account goes back to free on its own. Nothing is charged. Stocks you already follow and alerts you already set stay — you just can't add more than the free limits.",
    bn: "মাস শেষে অ্যাকাউন্ট নিজে থেকেই ফ্রি হয়ে যাবে, কোনো টাকা কাটা হবে না। আগের ওয়াচলিস্ট আর অ্যালার্ট থেকে যাবে, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
  },
  {
    q: "Can I take the free month twice?",
    a: "One free month per account. Paid plans are coming soon.",
    bn: "প্রতি অ্যাকাউন্টে একবার। পেইড প্ল্যান শিগগিরই আসছে।",
  },
  {
    q: "Is this investment advice?",
    a: "No. Everything on TopStockBD is educational information built from company numbers. Always check a stock yourself before you buy or sell.",
    bn: "না। TopStockBD-র সবকিছু কোম্পানির হিসাব থেকে তৈরি শিক্ষামূলক তথ্য। কেনা-বেচার আগে নিজে যাচাই করুন।",
  },
];

export default function PremiumPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/premium`,
        url: `${BASE_URL}/premium`,
        name: "TopStockBD Premium",
        description: metadata.description,
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Premium", item: `${BASE_URL}/premium` },
        ],
      },
    ],
  };

  return (
    <div className="page-narrow space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader
        eyebrow="Premium"
        title="The full analysis, free for a month"
        bn="পুরো বিশ্লেষণ — 1 মাস বিনামূল্যে।"
        lead="Prices and numbers stay free for everyone. Premium opens the reasons behind them — on every stock and on your own portfolio."
      />

      <PremiumContextCard />

      <section aria-labelledby="compare-h">
        <h2 id="compare-h" className="text-xl font-bold text-text-main">Free vs Premium</h2>
        <Bn className="text-sm text-text-muted mb-4">ফ্রি আর প্রিমিয়ামে কী পাবেন।</Bn>
        <div className="flex flex-col gap-3">
          {ROWS.map((r) => (
            <Card key={r.what} padding="none" className="p-4">
              <p className="font-semibold text-text-main">{r.what}</p>
              <Bn className="text-sm text-text-muted mb-3">{r.bn}</Bn>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold   text-text-muted">Free</p>
                  <p className="text-sm text-text-main leading-relaxed">{r.free}</p>
                </div>
                <div>
                  <p className="text-xs font-bold   text-primary">Premium</p>
                  <p className="text-sm text-text-main leading-relaxed">{r.premium}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="price-h">
        <h2 id="price-h" className="text-xl font-bold text-text-main">What it will cost</h2>
        <Bn className="text-sm text-text-muted mb-4">দাম কত হবে।</Bn>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANS.map((p) => (
            <Card key={p.name} padding="none" className={`p-4 ${p.best ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-text-main">{p.name}</p>
                {p.best && <span className="premium-chip">Best value</span>}
              </div>
              <Bn className="text-sm text-text-muted">{p.bn}</Bn>
              <p className="mt-3 tabular-nums">
                <span className="text-3xl font-bold text-text-main">{p.price}</span>{" "}
                <span className="text-sm text-text-muted">{p.per}</span>
              </p>
              <p className="mt-1 text-sm text-text-main">{p.note}</p>
              <Bn className="text-sm text-text-muted">{p.perBn} {p.price} · {p.noteBn}</Bn>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-sm text-text-main">
          Paid plans aren&apos;t open yet — nobody is charged today. Start with the free month below.
        </p>
        <Bn className="text-sm text-text-muted">পেইড প্ল্যান এখনো চালু হয়নি — এখন কোনো টাকা লাগবে না। নিচে ফ্রি মাস দিয়ে শুরু করুন।</Bn>
      </section>

      <Card id="start" padding="none" className="p-5 sm:p-6 scroll-mt-24">
        <p className="font-semibold text-text-main">Try everything free for 1 month</p>
        <Bn className="text-sm text-text-muted mb-3">1 মাস সব সুবিধা বিনামূল্যে ব্যবহার করুন।</Bn>
        <PremiumPlanCta />
      </Card>

      <section aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-xl font-bold text-text-main">Questions</h2>
        <Bn className="text-sm text-text-muted mb-4">সাধারণ প্রশ্ন।</Bn>
        <div className="flex flex-col gap-2">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-lg border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-text-main">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-text-main">{f.a}</p>
              <Bn className="mt-1 text-sm leading-relaxed text-text-muted">{f.bn}</Bn>
            </details>
          ))}
        </div>
      </section>

      <p className="text-sm text-text-muted">
        Want to see how the score works first? Read{" "}
        <Link href="/about" className="font-semibold text-primary">how we score</Link>.
      </p>
    </div>
  );
}
