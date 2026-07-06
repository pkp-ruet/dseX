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
    <main className="max-w-2xl mx-auto px-4 py-10 sm:py-12 space-y-12">

      {/* Hero */}
      <section className="soft-card ambient-panel p-6 sm:p-8 text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
          About TopStockBD
        </span>
        <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.1] tracking-tight text-[var(--ink)]">
          We do the homework so you don&apos;t have to.
        </h1>
        <p className="text-[1.0625rem] leading-[1.7] text-[var(--ink-2)] max-w-xl mx-auto">
          TopStockBD is a free tool that analyzes the fundamentals of every company listed on the
          Dhaka Stock Exchange (DSE) — and scores them so you can make better decisions without
          reading a single annual report.
        </p>
      </section>

      {/* The Problem */}
      <section className="space-y-3.5">
        <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">The problem we&apos;re solving</h2>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          Most retail investors in Bangladesh buy stocks based on tips from friends, brokers, or social
          media. Not because they don&apos;t care about fundamentals — but because doing proper research is
          genuinely hard.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          Reading an annual report takes hours. You need to understand accounting. You need to compare
          numbers across years. You need to know what&apos;s a good P/E ratio for a textile company versus
          a pharmaceutical one. Most people simply don&apos;t have the time or the training.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          That&apos;s where TopStockBD comes in.
        </p>
      </section>

      {/* What We Do */}
      <section className="space-y-3.5">
        <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">What we actually do</h2>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          We pull publicly available financial data for all DSE-listed companies — earnings, debt,
          margins, dividends, valuation — and run it through a consistent scoring model that boils
          everything down to a single <strong className="text-[var(--ink)]">stock score, from 0 to 100</strong>.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          The score reflects how strong a company looks across five
          key dimensions of fundamental analysis. Higher is better. Companies are then grouped into
          ratings — <strong className="text-[var(--ink)]">Excellent, Good, Average,</strong> and{" "}
          <strong className="text-[var(--ink)]">Weak</strong> — so you can filter quickly.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          Separately, every stock carries a simple <strong className="text-[var(--ink)]">Buy / Hold / Sell
          signal</strong>. The rating tells you how strong the company is; the signal tells you whether
          now looks like a sensible time to act — it also weighs the current price and how actively
          the share trades.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          No predictions. No price targets. Just a clear, structured view of what the numbers say.
        </p>
      </section>

      {/* The 5 Pillars */}
      <section className="space-y-5">
        <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">The 5 things we measure</h2>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          Every company gets scored on five pillars. Each one reflects a question a fundamental
          analyst would ask when reading the financials.
        </p>
        <div className="space-y-3.5">
          {PILLARS.map((p) => (
            <div key={p.label} className="soft-card flex gap-4 p-5">
              <span className="text-2xl shrink-0 mt-0.5">{p.icon}</span>
              <div>
                <div className="font-bold text-[var(--ink)] text-[1.05rem] mb-1">{p.label}</div>
                <div className="text-[0.95rem] text-[var(--ink-2)] leading-[1.7]">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Goal */}
      <section className="space-y-3.5">
        <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold tracking-tight text-[var(--ink)]">Our goal</h2>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          We want to give every investor in Bangladesh — whether you&apos;re a student, a small saver, or
          a seasoned trader — the kind of insight that used to require a financial analyst or hours of
          spreadsheet work.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          Fundamental analysis shouldn&apos;t be gatekept behind complexity. The data is public. The math
          is knowable. We just do it for you, consistently, across the entire market.
        </p>
        <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
          TopStockBD is free. It always will be.
        </p>
      </section>

      {/* What We Are Not */}
      <section className="soft-card p-6 space-y-4">
        <h2 className="text-[1.15rem] font-bold text-[var(--ink)]">What we are not</h2>
        <ul className="space-y-3">
          {[
            "We are not financial advisors. Nothing here is investment advice.",
            "We are not a broker. We don't execute trades or earn commissions.",
            "We are not predicting future prices. Scores reflect historical fundamentals only.",
            "A high score does not guarantee a stock will go up. Always do your own due diligence.",
          ].map((item) => (
            <li key={item} className="flex gap-3 text-[0.98rem] leading-[1.65] text-[var(--ink-2)]">
              <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-[1.0625rem] font-semibold text-[var(--ink)]">Ready to explore the rankings?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dsestockranking" className="ui-btn ui-btn-md ui-btn-primary">
            View Score Leaderboard
          </Link>
          <Link href="/" className="ui-btn ui-btn-md ui-btn-ghost">
            Back to Home
          </Link>
        </div>
      </section>

    </main>
  );
}
