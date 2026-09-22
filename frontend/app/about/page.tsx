import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "TopStockBD makes fundamental stock analysis accessible to every investor in Bangladesh. No annual reports, no spreadsheets — just clear scores based on real financials.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    label: "Earnings & Profitability",
    desc: "Is the company actually making money — and has it been doing so consistently? We look at earnings per share over 5 years, profit growth, and return on equity.",
  },
  {
    label: "Financial Health",
    desc: "Does the company have too much debt? Can it pay its bills? We check the balance sheet for debt levels, cash flow from operations, and liquidity. For banks we look at their capital cushion instead — how much of their own money stands behind the loans.",
  },
  {
    label: "Competitive Strength",
    desc: "Can the company hold its ground against competitors? We measure profit margins, revenue stability year over year, and how the company stacks up in its sector.",
  },
  {
    label: "Valuation",
    desc: "Is the stock priced fairly right now? We compare today's price-to-earnings and price-to-book ratios against the company's own 5-year historical averages — not against hype.",
  },
  {
    label: "Dividend Quality",
    desc: "Does the company reward its shareholders — and can it afford to? We track how consistently it pays cash dividends, what share of profit that dividend takes, the current yield, and whether the payout has grown.",
  },
];

export default function AboutPage() {
  return (
    <div className="page-narrow space-y-12">
      <PageHeader
        eyebrow="About TopStockBD"
        title={<>We do the homework so you don&apos;t have to.</>}
        bn="ঢাকা স্টক এক্সচেঞ্জের সব কোম্পানির হিসাব আমরা দেখে দেই — আপনি শুধু স্কোর দেখে বুঝে নিন।"
        lead="TopStockBD is a free tool that analyzes the fundamentals of every company listed on the Dhaka Stock Exchange (DSE) — and scores them so you can make better decisions without reading a single annual report."
      />

      {/* The Problem */}
      <section className="space-y-3.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">The problem we&apos;re solving</h2>
        <p className="text-lg leading-[1.78] text-text-muted">
          Most retail investors in Bangladesh buy stocks based on tips from friends, brokers, or social
          media. Not because they don&apos;t care about fundamentals — but because doing proper research is
          genuinely hard.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          Reading an annual report takes hours. You need to understand accounting. You need to compare
          numbers across years. You need to know what&apos;s a good P/E ratio for a textile company versus
          a pharmaceutical one. Most people simply don&apos;t have the time or the training.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          That&apos;s where TopStockBD comes in.
        </p>
      </section>

      {/* What We Do */}
      <section className="space-y-3.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">What we actually do</h2>
        <p className="text-lg leading-[1.78] text-text-muted">
          We pull publicly available financial data for all DSE-listed companies — earnings, debt,
          margins, dividends, valuation — and run it through a consistent scoring model that boils
          everything down to a single <strong className="text-text-main">stock score, from 0 to 100</strong>.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          The score reflects how strong a company looks across five
          key dimensions of fundamental analysis. Higher is better. Companies are then grouped into
          ratings — <strong className="text-text-main">Excellent, Good, Average,</strong> and{" "}
          <strong className="text-text-main">Weak</strong> — so you can filter quickly.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          Separately, every stock carries a simple <strong className="text-text-main">Buy / Sell
          signal</strong>. The rating tells you how strong the company is; the signal tells you whether
          now looks like a sensible time to act — it also weighs the current price and how actively
          the share trades. When neither applies, no signal is shown.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          No predictions. No price targets. Just a clear, structured view of what the numbers say.
        </p>
      </section>

      {/* The 5 Pillars */}
      <section className="space-y-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">The 5 things we measure</h2>
        <p className="text-lg leading-[1.78] text-text-muted">
          Every company gets scored on five pillars. Each one reflects a question a fundamental
          analyst would ask when reading the financials.
        </p>
        <div className="space-y-3.5">
          {PILLARS.map((p, i) => (
            <div key={p.label} className="soft-card flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary-ink tabular-nums"
              >
                {i + 1}
              </span>
              <div>
                <div className="font-bold text-text-main text-base mb-1">{p.label}</div>
                <div className="text-base text-text-muted leading-[1.7]">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Goal */}
      <section className="space-y-3.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main">Our goal</h2>
        <p className="text-lg leading-[1.78] text-text-muted">
          We want to give every investor in Bangladesh — whether you&apos;re a student, a small saver, or
          a seasoned trader — the kind of insight that used to require a financial analyst or hours of
          spreadsheet work.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          Fundamental analysis shouldn&apos;t be gatekept behind complexity. The data is public. The math
          is knowable. We just do it for you, consistently, across the entire market.
        </p>
        <p className="text-lg leading-[1.78] text-text-muted">
          TopStockBD is free. It always will be.
        </p>
      </section>

      {/* What We Are Not */}
      <section className="soft-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-main">What we are not</h2>
        <ul className="space-y-3">
          {[
            "We are not financial advisors. Nothing here is investment advice.",
            "We are not a broker. We don't execute trades or earn commissions.",
            "We are not predicting future prices. Scores reflect historical fundamentals only.",
            "A high score does not guarantee a stock will go up. Always do your own due diligence.",
          ].map((item) => (
            <li key={item} className="flex gap-3 text-base leading-[1.65] text-text-muted">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-lg font-semibold text-text-main">Ready to explore the rankings?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dsestockranking" className="btn-primary">
            View Score Leaderboard
          </Link>
          <Link href="/" className="btn-quiet">
            Back to Home
          </Link>
        </div>
      </section>

    </div>
  );
}
