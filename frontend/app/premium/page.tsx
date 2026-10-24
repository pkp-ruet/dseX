import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PayBox from "@/components/premium/PayBox";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Premium — Full Stock Analysis, Free for a Month",
  description:
    "TopStockBD Premium: the full analysis on every DSE stock page, a deeper portfolio check with an action list, a watcher on every stock you own, your full portfolio history, a what-if tool, a yearly statement, more than one portfolio, unlimited watchlist with a glance board, price alerts and TopStock AI. Try it free for one month, then from ৳199 by bKash or Nagad.",
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
    description: "The full analysis behind every DSE stock and your portfolio. One free month, then from ৳199 by bKash or Nagad.",
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
  {
    what: "Watchlist",
    bn: "ওয়াচলিস্ট",
    free: "10 stocks, and how many trade under fair value, have a record date soon or carry a risk flag",
    premium: "No limit, and a board with every stock's price against its fair value, what stops a Buy, its next record date or AGM, and its risk flags",
  },
  { what: "Price alerts", bn: "প্রাইস অ্যালার্ট", free: "3 at a time", premium: "No limit" },
  { what: "TopStock AI", bn: "টপস্টক এআই", free: "10 questions a day", premium: "No limit" },
];

const FAQS: { q: string; a: string; bn: string }[] = [
  {
    q: "How much does Premium cost?",
    a: "৳199 for 1 month, ৳499 for 3 months or ৳1,499 for a year. Every account can also try it free for one month first.",
    bn: "1 মাস ৳199, 3 মাস ৳499, 1 বছর ৳1,499। প্রতিটি অ্যাকাউন্ট প্রথমে 1 মাস ফ্রিতেও ব্যবহার করতে পারে।",
  },
  {
    q: "How do I pay?",
    a: "With bKash or Nagad. Pick a plan, use Send Money to send the amount to the number shown on this page, then type the number you sent it from and tap the button. Premium starts straight away.",
    bn: "bKash বা Nagad দিয়ে। প্ল্যান বেছে নিন, এই পাতার নম্বরে Send Money করে টাকা পাঠান, তারপর যে নম্বর থেকে পাঠিয়েছেন সেটি লিখে বোতাম চাপুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
  },
  {
    q: "What if you can't find my payment?",
    a: "We check every payment against our bKash and Nagad statements. If no money came from the number you typed, Premium is switched off and the days are taken back. Typed the wrong number by mistake? Contact us and we'll sort it out.",
    bn: "প্রতিটি পেমেন্ট আমরা bKash ও Nagad-এর হিসাবের সাথে মিলিয়ে দেখি। আপনার লেখা নম্বর থেকে টাকা না এলে প্রিমিয়াম বন্ধ হবে। ভুল নম্বর লিখে ফেললে আমাদের সাথে যোগাযোগ করুন।",
  },
  {
    q: "Does it renew by itself?",
    a: "No. Nothing is taken from your account automatically. A few days before your plan ends we remind you, and you pay again only if you want to keep it.",
    bn: "না। আপনার অ্যাকাউন্ট থেকে নিজে থেকে কোনো টাকা কাটা হয় না। প্ল্যান শেষ হওয়ার কয়েক দিন আগে মনে করিয়ে দেব; চাইলে আবার পেমেন্ট করবেন।",
  },
  {
    q: "Can I get my money back?",
    a: "Yes — ask within 7 days of paying and we send the full amount back to the number you paid from. See the refund policy for the details.",
    bn: "হ্যাঁ — পেমেন্টের 7 দিনের মধ্যে জানালে পুরো টাকা যে নম্বর থেকে দিয়েছেন সেখানে ফেরত দেব। বিস্তারিত রিফান্ড নীতিতে।",
  },
  {
    q: "What happens when my plan or free month ends?",
    a: "Your account goes back to free on its own. Stocks you already follow and alerts you already set stay — you just can't add more than the free limits.",
    bn: "মেয়াদ শেষে অ্যাকাউন্ট নিজে থেকেই ফ্রি হয়ে যাবে। আগের ওয়াচলিস্ট আর অ্যালার্ট থেকে যাবে, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
  },
  {
    q: "Can I take the free month twice?",
    a: "One free month per account. After that, pick any plan above.",
    bn: "প্রতি অ্যাকাউন্টে একবার। এরপর উপরের যেকোনো প্ল্যান নিতে পারেন।",
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

      <Card id="start" padding="none" className="p-5 sm:p-6 scroll-mt-24">
        <p className="font-semibold text-text-main">Try everything free for 1 month</p>
        <Bn className="text-sm text-text-muted mb-3">1 মাস সব সুবিধা বিনামূল্যে ব্যবহার করুন।</Bn>
        <PremiumPlanCta />
      </Card>

      <section id="pay" aria-labelledby="price-h" className="scroll-mt-24">
        <h2 id="price-h" className="text-xl font-bold text-text-main">Plans and prices</h2>
        <Bn className="text-sm text-text-muted mb-1">প্ল্যান ও দাম।</Bn>
        <p className="text-sm text-text-main mb-4">
          Pay by bKash or Nagad. Nothing renews by itself.{" "}
          <Link href="/refund-policy" className="font-semibold text-primary">Refund policy</Link>
        </p>
        <PayBox />
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
