import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Bn from "@/components/i18n/Bn";
import { IconBulb, IconCheck, IconList, IconSparkle, IconWallet } from "@/components/ui/icons";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PayBox from "@/components/premium/PayBox";
import { LOWEST_PRICE, PAID_PLANS } from "@/lib/premium-plans";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
const PER_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : LOWEST_PRICE;

export const metadata: Metadata = {
  title: "Premium — The Full Analysis on Every DSE Stock",
  description: `TopStockBD Premium: the reasons behind every DSE stock score, a daily watcher and action list for your portfolio, six research lists in full, the full dividend calendar, and no limits on watchlist, price alerts or TopStock AI. From ৳${LOWEST_PRICE}, paid by bKash or Nagad. No auto-renewal, 7-day refund.`,
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
    title: "TopStockBD Premium — see the reasons behind every number",
    description: `The full analysis behind every DSE stock and your portfolio. From ৳${LOWEST_PRICE} by bKash or Nagad.`,
    url: `${BASE_URL}/premium`,
    type: "website",
  },
};

// The four things Premium does, in plain words. Every point is a live feature.
// Points stay short and English-only (small UI text rule); the Bengali line
// under each title carries the idea.
const BENEFITS: { icon: ReactNode; title: string; bn: string; points: string[] }[] = [
  {
    icon: <IconBulb size={20} />,
    title: "Know why, not just what",
    bn: "শুধু স্কোর নয়, তার কারণও জানুন",
    points: ["A fair price for every stock", "All five health checks and warnings", "The whole in-depth report"],
  },
  {
    icon: <IconWallet size={20} />,
    title: "Your portfolio, watched daily",
    bn: "আপনার পোর্টফোলিও, প্রতিদিন পাহারায়",
    points: ["An alert when your stock needs attention", "New results and grade changes, explained", "Full history and a yearly statement"],
  },
  {
    icon: <IconList size={20} />,
    title: "Research, done for you",
    bn: "গবেষণা আমরা করে দিই",
    points: ["Six research lists in full", "Your own lists, checked every day", "The complete dividend calendar"],
  },
  {
    icon: <IconSparkle size={20} />,
    title: "No limits",
    bn: "কোনো সীমা নেই",
    points: ["Follow any number of stocks", "Set any number of price alerts", "Ask TopStock AI anything, any time"],
  },
];

const STEPS: { en: string; bn: string; sub: string }[] = [
  { en: "Pick a plan", bn: "প্ল্যান বেছে নিন", sub: "1 month, 3 months or 1 year" },
  { en: "Send Money", bn: "Send Money করুন", sub: "By bKash or Nagad" },
  { en: "Type your number", bn: "নম্বর লিখুন", sub: "Premium starts at once" },
];

// Line-by-line, for readers who want every detail. Only features that are live.
const ROWS: { what: string; bn: string; free: string; premium: string }[] = [
  {
    what: "Stock page analysis",
    bn: "শেয়ারের পাতার বিশ্লেষণ",
    free: "Prices, charts, financials, dividends, owners, news + the score, grade and Buy/Sell word",
    premium: "Also the reasons: fair-value estimate, all five health checks, every good sign and watch-out, price verdict, sector standing",
  },
  { what: "In-depth reports", bn: "গভীর বিশ্লেষণ রিপোর্ট", free: "Headline, bottom line and the first section", premium: "The whole report" },
  {
    what: "Results day, explained",
    bn: "ত্রৈমাসিক ফল, সহজ ভাষায়",
    free: "The headline and the profit figures of each stock's latest quarterly report, and the newest 5 reports on the results page",
    premium: "Every company's latest results in one list, and on each stock the latest quarter alone, cash from the business, what the price costs on the last 12 months' profit, how our score moved, and what it means — plus a phone alert the day results come out for a stock you own or follow",
  },
  {
    what: "Score history",
    bn: "স্কোরের ইতিহাস",
    free: "Today's score and how many times the grade changed",
    premium: "The score on every trading day, each grade change with the reason behind it, and a phone alert when the grade of a stock you own or follow changes",
  },
  {
    what: "Portfolio check",
    bn: "পোর্টফোলিও পরীক্ষা",
    free: "Grade, its three scores, the first point of what's working, and your spread by company and sector",
    premium: "Every point, including what needs your attention and what to consider, plus what to do with each stock, what to buy next, each holding's full read, a risk check, the price you paid, cash income and you vs the market",
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
    free: "Your value over time next to DSEX, and money made from sales and dividends — before and after fees and tax",
    premium: "The same, plus a yearly statement (below)",
  },
  { what: "What-if check", bn: "যদি এমন করি", free: "—", premium: "Try a sale or a buy and see your portfolio grade before you act" },
  {
    what: "Yearly statement",
    bn: "বার্ষিক হিসাব",
    free: "—",
    premium: "Every buy, sale, cash dividend and bonus share for the year — print it or download it",
  },
  { what: "Portfolios", bn: "পোর্টফোলিও সংখ্যা", free: "One", premium: "Up to six — keep a parent's or spouse's BO account apart from yours" },
  {
    what: "Research lists",
    bn: "গবেষণা তালিকা",
    free: "What each of the six lists looks for, and how many companies pass its checks",
    premium: "Every stock on all six lists: a research card with its fair-value range and main risk, all of them side by side, and who joined or left this month",
  },
  {
    what: "Your own lists",
    bn: "নিজের তালিকা",
    free: "Build a list from 23 checks and see how many companies pass",
    premium: "Which companies pass, and up to 5 saved lists checked every trading day — with a phone alert when a new stock passes",
  },
  {
    what: "Dividend calendar",
    bn: "ডিভিডেন্ড ক্যালেন্ডার",
    free: "A few rows of each list: record dates, AGMs, biggest cash dividends, just declared",
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
    a: "৳199 for 1 month, ৳499 for 3 months or ৳1,499 for a year (about ৳125 a month).",
    bn: "1 মাস ৳199, 3 মাস ৳499, 1 বছর ৳1,499 (মাসে প্রায় ৳125)।",
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
    q: "What happens when my plan ends?",
    a: "Your account goes back to free on its own. Stocks you already follow and alerts you already set stay — you just can't add more than the free limits.",
    bn: "মেয়াদ শেষে অ্যাকাউন্ট নিজে থেকেই ফ্রি হয়ে যাবে। আগের ওয়াচলিস্ট আর অ্যালার্ট থেকে যাবে, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
  },
  {
    q: "What stays free?",
    a: "Prices, charts, financials, dividends, news, the score and grade of every stock, the Buy/Sell word, rankings and the market pages. Premium adds the reasons and the tools on top.",
    bn: "দাম, চার্ট, আর্থিক হিসাব, লভ্যাংশ, খবর, প্রতিটি শেয়ারের স্কোর ও গ্রেড, কেনা/বেচার সংকেত, র‍্যাংকিং আর বাজারের পাতা — সব ফ্রি। প্রিমিয়াম তার উপরে কারণ আর টুল যোগ করে।",
  },
  {
    q: "Is this investment advice?",
    a: "No. Everything on TopStockBD is educational information built from company numbers. Always check a stock yourself before you buy or sell.",
    bn: "না। TopStockBD-র সবকিছু কোম্পানির হিসাব থেকে তৈরি শিক্ষামূলক তথ্য। কেনা-বেচার আগে নিজে যাচাই করুন।",
  },
];

const PROMISES: { en: string }[] = [
  { en: "Pay by bKash or Nagad" },
  { en: "No auto-renewal" },
  { en: "7-day full refund" },
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
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="page-narrow space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 1 · The promise, the price, the next step */}
      <section className="pm-hero">
        <PageHeader
          eyebrow="Premium"
          title="See the reasons behind every number"
          bn="প্রতিটি সংখ্যার পেছনের কারণ দেখুন।"
          lead="Prices and scores stay free for everyone. Premium tells you why — on every stock and on your own portfolio."
        />
        <p className="pm-price">
          <span className="text-sm text-text-muted">From</span>{" "}
          <span className="text-3xl font-bold text-text-main tabular-nums">৳{PER_MONTH}</span>{" "}
          <span className="text-sm text-text-muted">a month on the yearly plan</span>
        </p>
        <Bn className="text-sm text-text-muted">বছরের প্ল্যানে মাসে মাত্র ৳{PER_MONTH}।</Bn>
        <div className="mt-4">
          <PremiumPlanCta />
        </div>
        <ul className="pm-promises" aria-label="Our promises">
          {PROMISES.map((p) => (
            <li key={p.en}>
              <span className="text-primary" aria-hidden><IconCheck size={16} /></span>
              <span className="text-sm text-text-main">{p.en}</span>
            </li>
          ))}
        </ul>
      </section>

      <PremiumContextCard />

      {/* 2 · What you get, in four plain ideas */}
      <section aria-labelledby="get-h" id="what" className="scroll-mt-24">
        <SectionHeader
          id="get-h"
          title="What Premium does for you"
          bn="প্রিমিয়াম আপনার জন্য যা করে"
        />
        <div className="pm-benefits">
          {BENEFITS.map((b) => (
            <article key={b.title} className="pm-benefit">
              <div className="flex items-center gap-3">
                <span className="pm-benefit-icon" aria-hidden>{b.icon}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-text-main">{b.title}</h3>
                  <Bn className="text-sm text-text-muted">{b.bn}</Bn>
                </div>
              </div>
              <ul className="pm-points">
                {b.points.map((pt) => (
                  <li key={pt}>
                    <span className="text-primary" aria-hidden><IconCheck size={14} /></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm text-text-muted">
          Prices, charts, news, scores and the Buy/Sell word stay free for everyone.
        </p>
      </section>

      {/* 3 · How to pay, before the plan picker */}
      <section aria-labelledby="how-h">
        <SectionHeader id="how-h" title="Start in three steps" bn="তিন ধাপে শুরু করুন" />
        <ol className="pm-steps">
          {STEPS.map((st, i) => (
            <li key={st.en}>
              <span className="pm-step-n" aria-hidden>{i + 1}</span>
              <p className="mt-3 font-semibold text-text-main">{st.en}</p>
              <Bn className="text-sm text-text-muted">{st.bn}</Bn>
              <p className="mt-1 text-sm text-text-muted">{st.sub}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4 · Plans + pay */}
      <section id="pay" aria-labelledby="price-h" className="scroll-mt-24">
        <SectionHeader
          id="price-h"
          title="Choose your plan"
          bn="আপনার প্ল্যান বেছে নিন"
          lead={
            <>
              The longer the plan, the less you pay a month.{" "}
              <Link href="/refund-policy" className="font-semibold text-primary">Refund policy</Link>
            </>
          }
        />
        <PayBox />
      </section>

      {/* 5 · Every difference, for readers who want the detail */}
      <section aria-labelledby="compare-h">
        <SectionHeader id="compare-h" title="Free and Premium, side by side" bn="ফ্রি আর প্রিমিয়াম পাশাপাশি" />
        <details className="pm-compare">
          <summary className="pm-compare-summary">
            <span className="font-semibold text-text-main">See every difference ({ROWS.length})</span>
            <Bn as="span" className="text-sm text-text-muted">সব পার্থক্য দেখুন</Bn>
          </summary>
          <ul className="divide-y divide-border">
            {ROWS.map((r) => (
              <li key={r.what} className="px-4 py-4">
                <p className="font-semibold text-text-main">{r.what}</p>
                <Bn className="text-sm text-text-muted mb-2">{r.bn}</Bn>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-text-muted">Free</p>
                    <p className="text-sm text-text-muted leading-relaxed">{r.free}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">Premium</p>
                    <p className="text-sm text-text-main leading-relaxed">{r.premium}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* 6 · Questions */}
      <section aria-labelledby="faq-h">
        <SectionHeader id="faq-h" title="Questions" bn="সাধারণ প্রশ্ন" />
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
