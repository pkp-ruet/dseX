import Link from "next/link";

type NavItem = {
  href: string;
  title: string;
  desc: string;
  iconPath: string;
};

const items: NavItem[] = [
  {
    href: "/dsestockranking",
    title: "Score Leaderboard",
    desc: "Best stocks in Bangladesh ranked by fundamentals — top stocks DSE, blue chip stocks, undervalued stocks",
    iconPath: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
  },
  {
    href: "/dse-today",
    title: "DSE Today",
    desc: "Last trading day at a glance — DSEX index, market breadth, top movers, sector heatmap, and the day's news",
    iconPath: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  },
  {
    href: "/market-intelligence",
    title: "Market Intelligence",
    desc: "DSE top gainers and top losers today — live Bangladesh stock market signals and condition",
    iconPath: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  },
  {
    href: "/stock-insights",
    title: "Stock Insights",
    desc: "Top-20 curated insights: dividend stocks Bangladesh, high dividend DSE, undervalued stocks DSE",
    iconPath: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
  },
  {
    href: "/learn",
    title: "Beginner's Guide",
    desc: "How to invest in DSE, how to buy shares in Bangladesh, how to open BO account — Bangladesh stock market guide",
    iconPath: "M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z",
  },
  {
    href: "/about",
    title: "Behind the Score",
    desc: "DSE fundamental analysis explained — P/E ratio Bangladesh, DSEF 5-pillar scoring methodology",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
];

export default function NavHighlights() {
  return (
    <section className="mt-8 mb-4">
      <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium">
        Explore TopStockBD
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {items.map(({ href, title, desc, iconPath }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] transition-colors group"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0 mt-0.5 text-[var(--accent)]"
              aria-hidden="true"
            >
              <path d={iconPath} />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text)]">{title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0 mt-0.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"
              aria-hidden="true"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
