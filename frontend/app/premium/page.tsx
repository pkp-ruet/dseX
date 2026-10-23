import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Premium — Full Stock Analysis, Free for a Month",
  description:
    "TopStockBD Premium: the full analysis on every DSE stock page, a deeper portfolio check with an action list, unlimited watchlist, price alerts and TopStock AI. Try it free for one month — no payment.",
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
    what: "Dividend calendar",
    bn: "ডিভিডেন্ড ক্যালেন্ডার",
    free: "The first quarter of each list: record dates, AGMs, biggest cash dividends, just declared",
    premium: "Every list in full",
  },
  { what: "Watchlist", bn: "ওয়াচলিস্ট", free: "10 stocks", premium: "No limit" },
  { what: "Price alerts", bn: "প্রাইস অ্যালার্ট", free: "3 at a time", premium: "No limit" },
  { what: "TopStock AI", bn: "টপস্টক এআই", free: "10 questions a day", premium: "No limit" },
];

const FAQS: { q: string; a: string; bn: string }[] = [
  {
    q: "What does the free month cost?",
    a: "Nothing. Tap “Start my free month” on a signed-in account and Premium is on for 30 days. There is no card and no payment.",
    bn: "কিছুই না। সাইন ইন করে “Start my free month” চাপলেই 30 দিন প্রিমিয়াম চালু। কোনো কার্ড বা পেমেন্ট লাগবে না।",
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

      <Card padding="none" className="p-5 sm:p-6">
        <PremiumPlanCta />
      </Card>

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
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Free</p>
                  <p className="text-sm text-text-main leading-relaxed">{r.free}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Premium</p>
                  <p className="text-sm text-text-main leading-relaxed">{r.premium}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

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
