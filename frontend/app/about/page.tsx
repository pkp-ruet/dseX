import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — TopStockBD",
  description:
    "TopStockBD makes fundamental stock analysis accessible to every investor in Bangladesh. No annual reports, no spreadsheets — just clear scores based on real financials.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    label: "Earnings & Profitability",
    icon: "📈",
    desc: "Is the company actually making money — and has it been doing so consistently? We look at earnings per share over 5 years, profit growth, and return on equity.",
  },
  {
    label: "Financial Health",
    icon: "🏦",
    desc: "Does the company have too much debt? Can it pay its bills? We check the balance sheet for debt levels, cash flow from operations, and liquidity.",
  },
  {
    label: "Competitive Strength",
    icon: "💪",
    desc: "Can the company hold its ground against competitors? We measure profit margins, revenue stability year over year, and how the company stacks up in its sector.",
  },
  {
    label: "Valuation",
    icon: "🏷️",
    desc: "Is the stock priced fairly right now? We compare today's price-to-earnings and price-to-book ratios against the company's own 5-year historical averages — not against hype.",
  },
  {
    label: "Dividend Quality",
    icon: "💰",
    desc: "Does the company reward its shareholders? We track how consistently it pays dividends, whether those dividends have grown, and the current yield.",
  },
];

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-14">

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          We do the homework so you don&apos;t have to.
        </h1>
        <p className="text-[var(--ink-muted)] text-base leading-relaxed">
          TopStockBD is a free tool that analyzes the fundamentals of every company listed on the
          Dhaka Stock Exchange (DSE) — and scores them so you can make better decisions without
          reading a single annual report.
        </p>
      </section>

      {/* The Problem */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">The problem we&apos;re solving</h2>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Most retail investors in Bangladesh buy stocks based on tips from friends, brokers, or social
          media. Not because they don&apos;t care about fundamentals — but because doing proper research is
          genuinely hard.
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Reading an annual report takes hours. You need to understand accounting. You need to compare
          numbers across years. You need to know what&apos;s a good P/E ratio for a textile company versus
          a pharmaceutical one. Most people simply don&apos;t have the time or the training.
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          That&apos;s where TopStockBD comes in.
        </p>
      </section>

      {/* What We Do */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">What we actually do</h2>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          We pull publicly available financial data for all DSE-listed companies — earnings, debt,
          margins, dividends, valuation — and run it through a consistent scoring model we call the
          <strong className="text-[var(--ink)]"> DSEF Score</strong> (0 to 100).
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          The score gives you a single number that reflects how strong a company looks across five
          key dimensions of fundamental analysis. Higher is better. Companies are then grouped into
          tiers — <strong className="text-[var(--ink)]">Strong Buy, Good Buy, Safe Buy, Hold,</strong> and{" "}
          <strong className="text-[var(--ink)]">Avoid</strong> — so you can filter quickly.
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          No predictions. No price targets. Just a clear, structured view of what the numbers say.
        </p>
      </section>

      {/* The 5 Pillars */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold text-[var(--ink)]">The 5 things we measure</h2>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Every company gets scored on five pillars. Each one reflects a question a fundamental
          analyst would ask when reading the financials.
        </p>
        <div className="space-y-4">
          {PILLARS.map((p) => (
            <div
              key={p.label}
              className="flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <span className="text-2xl shrink-0 mt-0.5">{p.icon}</span>
              <div>
                <div className="font-semibold text-[var(--ink)] text-sm mb-1">{p.label}</div>
                <div className="text-[var(--ink-muted)] text-sm leading-relaxed">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Goal */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--ink)]">Our goal</h2>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          We want to give every investor in Bangladesh — whether you&apos;re a student, a small saver, or
          a seasoned trader — the kind of insight that used to require a financial analyst or hours of
          spreadsheet work.
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Fundamental analysis shouldn&apos;t be gatekept behind complexity. The data is public. The math
          is knowable. We just do it for you, consistently, across the entire market.
        </p>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          TopStockBD is free. It always will be.
        </p>
      </section>

      {/* What We Are Not */}
      <section className="space-y-3 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <h2 className="text-base font-semibold text-[var(--ink)]">What we are not</h2>
        <ul className="text-[var(--ink-muted)] text-sm space-y-2 leading-relaxed list-disc list-inside">
          <li>We are not financial advisors. Nothing here is investment advice.</li>
          <li>We are not a broker. We don&apos;t execute trades or earn commissions.</li>
          <li>We are not predicting future prices. Scores reflect historical fundamentals only.</li>
          <li>A high score does not guarantee a stock will go up. Always do your own due diligence.</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 pt-2">
        <p className="text-[var(--ink-muted)] text-sm">Ready to explore the rankings?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dsestockranking"
            className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Score Leaderboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </section>

    </main>
  );
}
